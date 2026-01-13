/**
 * Navigation event utilities
 */
export const NAVIGATE_EVENT = "app:navigate";
/**
 * Emit a navigation event to trigger route change
 */
export const emitNavigation = (key) => {
    window.dispatchEvent(new CustomEvent(NAVIGATE_EVENT, { detail: key }));
};
