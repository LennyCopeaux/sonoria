export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const isDefined = <T>(value: T | null | undefined): value is T =>
  value !== null && value !== undefined;

export * from "./formatDuration";
export * from "./pagination";
export * from "./slugify";
export * from "./types";
