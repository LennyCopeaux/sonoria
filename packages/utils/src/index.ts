export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const isDefined = <T>(value: T | null | undefined): value is T =>
  value !== null && value !== undefined;
