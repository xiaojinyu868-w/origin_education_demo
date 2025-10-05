export const NAVIGATE_EVENT = "app:navigate";
export const emitNavigation = (key) => {
    if (typeof window !== "undefined") {
        const event = new CustomEvent(NAVIGATE_EVENT, { detail: key });
        window.dispatchEvent(event);
    }
};
