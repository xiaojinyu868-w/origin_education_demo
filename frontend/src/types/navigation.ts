import type { ComponentType, LazyExoticComponent } from "react";

export type NavKey = "dashboard" | "roster" | "upload" | "mistake" | "practice" | "analytics" | "assistant";

export type NavItem = {
  key: NavKey;
  label: string;
  subtitle: string;
  headerTitle: string;
  headerDescription: string;
  path: string;
};

export type NavComponent = ComponentType | LazyExoticComponent<ComponentType>;
