export const COVER_STORAGE_KEY = "taozhiyy.home-cover.v1";
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
