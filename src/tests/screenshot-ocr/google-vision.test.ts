import { describe, expect, it } from "vitest";
import { groupGoogleTextAnnotations } from "@/lib/screenshot-ocr/google-vision-mapping";

function annotation(description: string, x0: number, y0: number, x1: number, y1: number) {
  return { description, boundingPoly: { vertices: [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }] } };
}

describe("Google Vision text mapping", () => {
  it("groups word annotations into ordered lines with combined bounds", () => {
    const lines = groupGoogleTextAnnotations([
      annotation("Standard Car\n₱245", 0, 0, 0, 0),
      annotation("₱245", 300, 410, 365, 438),
      annotation("Car", 142, 410, 190, 438),
      annotation("Standard", 30, 409, 134, 439),
      annotation("7:47", 24, 18, 70, 39),
    ]);

    expect(lines.map((line) => line.text)).toEqual(["7:47", "Standard Car ₱245"]);
    expect(lines[1]?.bbox).toEqual({ x0: 30, y0: 409, x1: 365, y1: 439 });
  });

  it("ignores the first full-text annotation and malformed entries", () => {
    expect(groupGoogleTextAnnotations([
      { description: "full text" },
      { description: "" },
      annotation("GrabCar", 10, 20, 100, 50),
    ])).toEqual([{ text: "GrabCar", bbox: { x0: 10, y0: 20, x1: 100, y1: 50 } }]);
  });
});
