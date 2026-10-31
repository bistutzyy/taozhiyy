const DIAL_INDEXES = [1, 2, 3, 4];
const finiteRotation = (rotation) => (Number.isFinite(rotation) ? rotation : 0);

export function getDialIndex(rotation, available = DIAL_INDEXES) {
  if (!Array.isArray(available)) return null;

  const angle = finiteRotation(rotation) % 360;
  let selected = null;
  let nearestDistance = Infinity;

  for (const index of DIAL_INDEXES) {
    if (!available.includes(index)) continue;

    const difference = Math.abs(angle + (index - 1) * 90) % 360;
    const distance = Math.min(difference, 360 - difference);
    if (distance < nearestDistance) {
      selected = index;
      nearestDistance = distance;
    }
  }

  return selected;
}

export function getDialRotation(index, fromRotation = 0) {
  const rotation = finiteRotation(fromRotation);
  const validIndex = DIAL_INDEXES.includes(index) ? index : 1;
  const angle = (1 - validIndex) * 90;
  return angle + Math.round((rotation - angle) / 360) * 360;
}

export function snapDialRotation(rotation, available = DIAL_INDEXES) {
  const index = getDialIndex(rotation, available);
  return index === null
    ? finiteRotation(rotation)
    : getDialRotation(index, rotation);
}
