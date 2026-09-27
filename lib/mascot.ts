/**
 * Utility functions to trigger mascot pose changes from anywhere in the app
 */

export type MascotPose = "idle" | "celebrate" | "empty" | "encouraging" | "waving" | "thinking" | "pointing";

/**
 * Trigger a mascot pose change
 * This dispatches a custom event that the ChatWidget listens to
 */
export function triggerMascotPose(pose: MascotPose) {
  if (typeof window !== "undefined") {
    const event = new CustomEvent<MascotPose>("mascot-pose", { detail: pose });
    window.dispatchEvent(event);
  }
}

/**
 * Trigger the mascot assembly animation
 * This dispatches a custom event that the ChatWidget listens to
 */
export function triggerMascotAssembly() {
  if (typeof window !== "undefined") {
    const event = new CustomEvent("mascot-assembly");
    window.dispatchEvent(event);
  }
}

/**
 * Convenience functions for common mascot triggers
 */
export const mascotTriggers = {
  celebrate: () => triggerMascotPose("celebrate"),
  encourage: () => triggerMascotPose("encouraging"),
  wave: () => triggerMascotPose("waving"),
  think: () => triggerMascotPose("thinking"),
  point: () => triggerMascotPose("pointing"),
  sad: () => triggerMascotPose("empty"),
  idle: () => triggerMascotPose("idle"),
  assemble: () => triggerMascotAssembly(),
};
