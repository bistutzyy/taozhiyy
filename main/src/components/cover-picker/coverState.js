export const COVER_STORAGE_KEY = "taozhiyy.home-cover.v1";
export const COVER_BRIGHTNESS_KEY = "taozhiyy.home-cover-brightness.v1";
export const COVER_INDEXES = [1, 2, 3, 4];

export function resolveCoverIndex(value) {
  const index =
    typeof value === "string" && /^[1-4]$/.test(value) ? Number(value) : value;
  return COVER_INDEXES.includes(index) ? index : 1;
}

export function readCoverPreference(storage) {
  try {
    return resolveCoverIndex(storage?.getItem(COVER_STORAGE_KEY));
  } catch {
    return 1;
  }
}

export function writeCoverPreference(storage, index) {
  try {
    storage?.setItem(COVER_STORAGE_KEY, String(resolveCoverIndex(index)));
  } catch {
    /* Cover selection remains available when storage is blocked. */
  }
}

export function resolveCoverBrightness(value) {
  const brightness =
    typeof value === "string" && /^[1-9]\d*$/.test(value)
      ? Number(value)
      : value;
  return Number.isInteger(brightness) && brightness >= 70 && brightness <= 115
    ? brightness
    : 100;
}

export function readCoverBrightness(storage) {
  try {
    return resolveCoverBrightness(storage?.getItem(COVER_BRIGHTNESS_KEY));
  } catch {
    return 100;
  }
}

export function writeCoverBrightness(storage, value) {
  try {
    storage?.setItem(
      COVER_BRIGHTNESS_KEY,
      String(resolveCoverBrightness(value)),
    );
  } catch {
    /* Brightness remains available when storage is blocked. */
  }
}

export function getRandomCoverIndex(
  available,
  current,
  random = Math.random(),
) {
  const alternates = [...new Set(available ?? [])].filter(
    (index) => COVER_INDEXES.includes(index) && index !== current,
  );
  if (!alternates.length) return null;
  const sample = Number.isFinite(random) ? Math.max(0, Math.min(1, random)) : 0;
  return alternates[
    Math.min(Math.floor(sample * alternates.length), alternates.length - 1)
  ];
}
