import { Environment } from "../world/Environment";
import { FeatureToggles } from "./FeatureToggles";

export function initDebugControls(environment: Environment) {
  window.addEventListener("keydown", (event) => {
    // Check if day/night keys are enabled
    const toggles = FeatureToggles.getInstance();
    if (!toggles.isEnabled('enable_day_night_keys')) {
      return;
    }

    // Only trigger if not typing in an input (though we don't have inputs yet, good practice)
    if (
      document.activeElement?.tagName === "INPUT" ||
      document.activeElement?.tagName === "TEXTAREA"
    )
      return;

    switch (event.code) {
      case "KeyK":
        console.log("Debug: Setting time to Night");
        environment.setTimeToNight();
        break;
      case "KeyL":
        console.log("Debug: Setting time to Day");
        environment.setTimeToDay();
        break;
    }
  });
}
