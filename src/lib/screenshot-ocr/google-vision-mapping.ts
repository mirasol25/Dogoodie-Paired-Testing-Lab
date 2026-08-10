export type GoogleTextAnnotation = { description?: string | null; boundingPoly?: { vertices?: Array<{ x?: number | null; y?: number | null }> | null } | null };
export type GoogleRecognizedLine = { text: string; bbox: { x0: number; y0: number; x1: number; y1: number } };

function annotationBox(annotation: GoogleTextAnnotation) {
  const vertices = annotation.boundingPoly?.vertices ?? [];
  if (!vertices.length) return null;
  const xs = vertices.map((item) => Number(item.x ?? 0));
  const ys = vertices.map((item) => Number(item.y ?? 0));
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}

export function groupGoogleTextAnnotations(annotations: GoogleTextAnnotation[]): GoogleRecognizedLine[] {
  const words = annotations.slice(1).flatMap((annotation) => {
    const text = annotation.description?.trim();
    const bbox = annotationBox(annotation);
    return text && bbox ? [{ text, bbox }] : [];
  }).sort((a, b) => a.bbox.y0 - b.bbox.y0 || a.bbox.x0 - b.bbox.x0);

  const lines: Array<{ words: typeof words; centerY: number; height: number }> = [];
  for (const word of words) {
    const centerY = (word.bbox.y0 + word.bbox.y1) / 2;
    const height = Math.max(1, word.bbox.y1 - word.bbox.y0);
    const line = lines.find((candidate) => Math.abs(candidate.centerY - centerY) <= Math.max(6, Math.min(candidate.height, height) * 0.65));
    if (line) {
      line.words.push(word);
      const count = line.words.length;
      line.centerY = ((line.centerY * (count - 1)) + centerY) / count;
      line.height = Math.max(line.height, height);
    } else lines.push({ words: [word], centerY, height });
  }

  return lines.sort((a, b) => a.centerY - b.centerY).map((line) => {
    const sorted = line.words.sort((a, b) => a.bbox.x0 - b.bbox.x0);
    return {
      text: sorted.map((item) => item.text).join(" "),
      bbox: {
        x0: Math.min(...sorted.map((item) => item.bbox.x0)),
        y0: Math.min(...sorted.map((item) => item.bbox.y0)),
        x1: Math.max(...sorted.map((item) => item.bbox.x1)),
        y1: Math.max(...sorted.map((item) => item.bbox.y1)),
      },
    };
  });
}
