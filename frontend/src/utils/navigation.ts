/**
 * Navigation event utilities
 */

import type { NavKey } from "../types/navigation";

export const NAVIGATE_EVENT = "app:navigate";

/**
 * Emit a navigation event to trigger route change
 */
export const emitNavigation = (key: NavKey) => {
  window.dispatchEvent(new CustomEvent<NavKey>(NAVIGATE_EVENT, { detail: key }));
};
