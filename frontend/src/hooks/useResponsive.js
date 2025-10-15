import { useMemo } from "react";
import { Grid } from "antd";
const BREAKPOINT_SEQUENCE = ["xxl", "xl", "lg", "md", "sm", "xs"];
const DEFAULT_SCREENS = {
    xs: true,
    sm: false,
    md: false,
    lg: false,
    xl: false,
    xxl: false,
};
const useResponsive = () => {
    const screens = Grid.useBreakpoint();
    const activeBreakpoint = useMemo(() => {
        for (const key of BREAKPOINT_SEQUENCE) {
            if (screens?.[key]) {
                return key;
            }
        }
        return "xs";
    }, [screens]);
    const orderLookup = useMemo(() => {
        return BREAKPOINT_SEQUENCE.reduce((acc, key, index) => {
            acc[key] = index;
            return acc;
        }, {});
    }, []);
    const down = (target) => {
        const targetIndex = orderLookup[target];
        const activeIndex = orderLookup[activeBreakpoint];
        return activeIndex >= targetIndex;
    };
    const up = (target) => {
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
