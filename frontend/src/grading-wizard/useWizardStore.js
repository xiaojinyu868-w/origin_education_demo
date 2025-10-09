import { useContext } from "react";
import { WizardContext } from "./WizardProvider";
export const useWizardStore = () => {
    const context = useContext(WizardContext);
    if (!context) {
        throw new Error("useWizardStore must be used within a WizardProvider");
    }
    return context;
};
