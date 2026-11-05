/** Bundled Ionicons only; stored values are stable identifiers, never remote URLs. */
export const profileIcons = [
  "person-circle",
  "person",
  "happy",
  "accessibility",
  "body",
  "heart",
  "star",
  "sparkles",
  "sunny",
  "moon",
  "planet",
  "earth",
  "rocket",
  "airplane",
  "bicycle",
  "car-sport",
  "bus",
  "train",
  "boat",
  "speedometer",
  "compass",
  "map",
  "navigate",
  "location",
  "leaf",
  "flower",
  "paw",
  "fish",
  "flame",
  "flash",
  "water",
  "umbrella",
  "musical-notes",
  "headset",
  "camera",
  "game-controller",
  "football",
  "basketball",
  "trophy",
  "ribbon",
] as const;
export type ProfileIcon = (typeof profileIcons)[number];
export const defaultProfileIcon: ProfileIcon = "person-circle";
export function isProfileIcon(value: unknown): value is ProfileIcon {
  return (
    typeof value === "string" &&
    (profileIcons as readonly string[]).includes(value)
  );
}
