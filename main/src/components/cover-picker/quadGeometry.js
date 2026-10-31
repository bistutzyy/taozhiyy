const center = [51, 47];
const top = [56, 0];
const right = [100, 40];
const bottom = [45, 100];
const left = [0, 55];
const percent = (value) => `${Number(value.toFixed(5))}%`;

function region(points) {
  const x = Math.min(...points.map((point) => point[0]));
  const y = Math.min(...points.map((point) => point[1]));
  const width = Math.max(...points.map((point) => point[0])) - x;
  const height = Math.max(...points.map((point) => point[1])) - y;
  return {
    points,
    style: {
      left: percent(x),
      top: percent(y),
      width: percent(width),
      height: percent(height),
      clipPath: `polygon(${points.map(([px, py]) => `${percent(((px - x) / width) * 100)} ${percent(((py - y) / height) * 100)}`).join(", ")})`,
    },
  };
}

export const QUAD_REGIONS = [
  region([[0, 0], top, center, left]),
  region([top, [100, 0], right, center]),
  region([left, center, bottom, [0, 100]]),
  region([center, right, [100, 100], bottom]),
];
export const QUAD_SEAMS = [top, right, bottom, left].map((end) => [
  center,
  end,
]);
