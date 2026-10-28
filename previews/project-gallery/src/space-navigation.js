export function spaceWindow(total, position, count = 6) {
  const max = Math.max(0, total - count);
  const current = Math.min(max, Math.max(0, Number.isFinite(position) ? position : 0));
  const start = Math.floor(current);
  return {position:current, start, end:Math.min(total,start+count+1), max};
}
export function wheelDistance(event, height) {
  const x = event.deltaX || 0, y = event.deltaY || 0;
  const delta = Math.abs(x) > Math.abs(y) ? x : y;
  const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? height : 1;
  return Math.max(-1.2, Math.min(1.2, delta * scale * .004));
}

export function motionBlend(milliseconds, response = 75) {
  return 1 - Math.exp(-Math.max(0,Math.min(50,milliseconds))/response);
}
