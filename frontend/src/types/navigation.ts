import type { ComponentType, LazyExoticComponent, ReactNode } from "react";

export type NavKey = 
  | "dashboard" 
  | "roster" 
  | "analytics" 
  | "upload" 
  | "mistake" 
  | "note" 
  | "practice" 
  | "assistant"
  | "tutor"
  | "models"
  | "summary"
  | "clips";

export type ModuleKey = "dashboard" | "class" | "library" | "toolkit";

export type NavItem = {
  key: NavKey;
  label: string;
  subtitle: string;
  headerTitle: string;
  headerDescription: string;
  path: string;
  icon?: ReactNode; // Optional icon for visual
};

export type NavModule = {
  key: ModuleKey;
  label: string;
  icon: ReactNode;
  path: string; // Base path for the module
  items: NavItem[]; // Sub-items
};

export type NavComponent = ComponentType | LazyExoticComponent<ComponentType>;
