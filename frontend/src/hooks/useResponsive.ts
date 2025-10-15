import { useMemo } from "react";
import { Grid } from "antd";

export type BreakpointKey = "xxl" | "xl" | "lg" | "md" | "sm" | "xs";

type ScreenMap = Partial<Record<BreakpointKey, boolean>>;

export type ResponsiveInfo = {
  screens: ScreenMap;
  activeBreakpoint: BreakpointKey;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  up: (target: BreakpointKey) => boolean;
  down: (target: BreakpointKey) => boolean;
};

const BREAKPOINT_SEQUENCE: BreakpointKey[] = ["xxl", "xl", "lg", "md", "sm", "xs"];

const DEFAULT_SCREENS: ScreenMap = {
  xs: true,
  sm: false,
  md: false,
  lg: false,
  xl: false,
  xxl: false,
};

const useResponsive = (): ResponsiveInfo => {
  const screens = Grid.useBreakpoint();

  const activeBreakpoint = useMemo<BreakpointKey>(() => {
    for (const key of BREAKPOINT_SEQUENCE) {
      if (screens?.[key]) {
        return key;
      }
    }
    return "xs";
  }, [screens]);

  const orderLookup = useMemo(() => {
    return BREAKPOINT_SEQUENCE.reduce<Record<BreakpointKey, number>>((acc, key, index) => {
      acc[key] = index;
      return acc;
    }, {} as Record<BreakpointKey, number>);
  }, []);

  const down = (target: BreakpointKey) => {
    const targetIndex = orderLookup[target];
    const activeIndex = orderLookup[activeBreakpoint];
    return activeIndex >= targetIndex;
  };

  const up = (target: BreakpointKey) => {
    const targetIndex = orderLookup[target];
    const activeIndex = orderLookup[activeBreakpoint];
    return activeIndex <= targetIndex;
  };

  const extendedScreens = screens && Object.keys(screens).length > 0 ? screens : DEFAULT_SCREENS;

  return {
    screens: extendedScreens,
    activeBreakpoint,
    isMobile: activeBreakpoint === "sm" || activeBreakpoint === "xs",
    isTablet: activeBreakpoint === "md",
    isDesktop: activeBreakpoint === "lg" || activeBreakpoint === "xl" || activeBreakpoint === "xxl",
    up,
    down,
  };
};

export default useResponsive;
