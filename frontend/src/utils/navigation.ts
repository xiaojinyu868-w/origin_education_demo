export const NAVIGATE_EVENT = "app:navigate" as const;

export const emitNavigation = (key: string) => {
  if (typeof window !== "undefined") {
    const event = new CustomEvent<string>(NAVIGATE_EVENT, { detail: key });
    window.dispatchEvent(event);
  }
};
