export const FOLLOW_CHANGED_EVENT = "sonoria:follow-changed";

export function notifyFollowChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(FOLLOW_CHANGED_EVENT));
  }
}
