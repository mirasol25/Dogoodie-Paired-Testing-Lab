import { differenceInMilliseconds, parseISO } from "date-fns";

export function timestampDifferenceSeconds(timestampA: string, timestampB: string): number {
  return Math.abs(differenceInMilliseconds(parseISO(timestampA), parseISO(timestampB))) / 1000;
}

