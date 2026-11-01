export const COVER_STORAGE_KEY = "taozhiyy.home-cover.v1";
export const HOME_COVER_VISIT_KEY = "taozhiyy.home-cover-visited.v1";
export const COVER_INDEXES = [1, 2, 3, 4];

export function updateCoverPreviewTrigger(
  triggers,
  source,
  index,
  active = true,
) {
  if (
    !["pointer", "focus", "command"].includes(source) ||
    !COVER_INDEXES.includes(index)
  )
    return triggers;
  if (active)
    return [
      ...triggers.filter((trigger) => trigger.source !== source),
      { source, index },
    ];
  const remaining = triggers.filter(
    (trigger) => trigger.source !== source || trigger.index !== index,
  );
  return remaining.length === triggers.length ? triggers : remaining;
}

export function getHighlightedCoverIndex(triggers, available) {
  for (let i = triggers.length - 1; i >= 0; i--)
    if (available.includes(triggers[i].index)) return triggers[i].index;
  return null;
}

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

export function getInitialCoverIndex(
  storage,
  random = Math.random(),
  navigationType = "navigate",
) {
  try {
    if (
      navigationType === "reload" &&
      storage?.getItem(HOME_COVER_VISIT_KEY) === "1"
    )
      return getRandomCoverIndex(COVER_INDEXES, null, random) ?? 1;
  } catch {
    /* A blocked session store keeps the first cover as a safe default. */
  }
  return 1;
}

export function markHomeCoverVisited(storage) {
  try {
    storage?.setItem(HOME_COVER_VISIT_KEY, "1");
  } catch {
    /* Cover switching remains available when storage is blocked. */
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
