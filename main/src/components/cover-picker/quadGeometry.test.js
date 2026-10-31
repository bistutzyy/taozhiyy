import test from "node:test";
import assert from "node:assert/strict";
import { QUAD_REGIONS, QUAD_SEAMS } from "./quadGeometry.js";

const contains = ([x, y], points) => {
  const signs = points.map(([ax, ay], i) => {
    const [bx, by] = points[(i + 1) % points.length];
    return (bx - ax) * (y - ay) - (by - ay) * (x - ax);
  });
  return (
    signs.every((value) => value >= 0) || signs.every((value) => value <= 0)
  );
};

test("four skewed regions cover the screen exactly once without holes or overlapping images", () => {
  assert.equal(QUAD_REGIONS.length, 4);
  for (let x = 0.37; x < 100; x += 2)
    for (let y = 0.29; y < 100; y += 2)
      assert.equal(
        QUAD_REGIONS.filter((region) => contains([x, y], region.points)).length,
        1,
        `${x},${y}`,
      );
});

test("the four photos have individual bounded frames and share an off-center junction", () => {
  for (const region of QUAD_REGIONS) {
    assert.ok(region.points.some(([x, y]) => x === 51 && y === 47));
    assert.ok(region.style.clipPath.startsWith("polygon("));
    assert.ok(
      parseFloat(region.style.width) > 40 &&
        parseFloat(region.style.width) < 60,
    );
    assert.ok(
      parseFloat(region.style.height) > 40 &&
        parseFloat(region.style.height) < 65,
    );
    assert.notEqual(
      region.style.clipPath,
      "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
    );
  }
  assert.equal(QUAD_SEAMS.length, 4);
  for (const seam of QUAD_SEAMS) assert.deepEqual(seam[0], [51, 47]);
});
