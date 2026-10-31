import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";

const moduleURL = new URL("./dialMath.js", import.meta.url);
const getMath = async () => {
  assert.ok(existsSync(moduleURL), "dial math module must exist");
  return import(moduleURL.href);
};

test("dial math module exists", () => {
  assert.ok(existsSync(moduleURL), "dial math module must exist");
});

test("clockwise dial angles select the four canonical indices", async () => {
  const { getDialIndex } = await getMath();
  for (const [rotation, index] of [
    [0, 1],
    [-90, 2],
    [-180, 3],
    [-270, 4],
    [90, 4],
    [180, 3],
    [270, 2],
  ]) {
    assert.equal(getDialIndex(rotation), index);
  }
});

test("selection wraps through positive and negative full turns", async () => {
  const { getDialIndex } = await getMath();
  for (let turns = -20; turns <= 20; turns += 1) {
    for (let index = 1; index <= 4; index += 1) {
      for (const offset of [-44.75, 0, 44.75]) {
        const rotation = -(index - 1) * 90 + turns * 360 + offset;
        assert.equal(getDialIndex(rotation), index, `rotation ${rotation}`);
      }
    }
  }
});

test("decimal boundary angles select the nearest cover", async () => {
  const { getDialIndex } = await getMath();
  for (const [rotation, index] of [
    [-44.99, 1],
    [-45.01, 2],
    [-134.99, 2],
    [-135.01, 3],
    [-224.99, 3],
    [-225.01, 4],
    [-314.99, 4],
    [-315.01, 1],
    [44.99, 1],
    [45.01, 4],
  ]) {
    assert.equal(getDialIndex(rotation), index);
  }
});

test("equidistant available covers always choose the smaller index", async () => {
  const { getDialIndex } = await getMath();
  for (let turns = -5; turns <= 5; turns += 1) {
    for (const [rotation, available, expected] of [
      [-45, [4, 3, 2, 1], 1],
      [-135, [4, 3, 2, 1], 2],
      [-225, [4, 3, 2, 1], 3],
      [-315, [4, 3, 2, 1], 1],
      [0, [4, 2], 2],
      [-180, [4, 2], 2],
      [-90, [3, 1], 1],
    ]) {
      assert.equal(getDialIndex(rotation + turns * 360, available), expected);
    }
  }
});

test("unavailable covers are skipped without changing the supplied list", async () => {
  const { getDialIndex, snapDialRotation } = await getMath();
  const available = Object.freeze([4, 2, 2, 0, 5, 1.5, "1", null, NaN]);
  assert.equal(getDialIndex(-10, available), 2);
  assert.equal(getDialIndex(-260, available), 4);
  assert.equal(getDialIndex(-90, [3]), 3);
  assert.equal(snapDialRotation(-10, available), -90);
  assert.equal(snapDialRotation(-260, available), -270);
  assert.deepEqual(available, [4, 2, 2, 0, 5, 1.5, "1", null, NaN]);
});

test("empty or malformed availability returns no cover", async () => {
  const { getDialIndex } = await getMath();
  for (const available of [
    [],
    [0, 5, -1, 1.1, "2", NaN, Infinity, null, true],
    null,
    {},
    "1234",
    2,
    new Set([1, 2]),
  ]) {
    assert.equal(getDialIndex(-90, available), null);
  }
});

test("nonfinite and nonnumeric rotations are normalized to zero", async () => {
  const { getDialIndex, getDialRotation, snapDialRotation } = await getMath();
  for (const rotation of [
    undefined,
    null,
    NaN,
    Infinity,
    -Infinity,
    "-90",
    false,
    {},
    [],
    1n,
    Symbol("rotation"),
  ]) {
    assert.equal(getDialIndex(rotation), 1);
    assert.equal(getDialIndex(rotation, [4, 2]), 2);
    assert.equal(getDialRotation(2, rotation), -90);
    assert.equal(snapDialRotation(rotation), 0);
    assert.equal(snapDialRotation(rotation, []), 0);
  }
});

test("nearest target equivalents keep the dial on its current turn", async () => {
  const { getDialRotation } = await getMath();
  for (const [index, rotation, expected] of [
    [1, -359, -360],
    [2, 350, 270],
    [1, 359.75, 360],
    [2, -449.5, -450],
    [3, 359, 180],
    [4, -359, -270],
    [1, 0.000000000000001, 0],
    [1, -0, 0],
  ]) {
    assert.equal(getDialRotation(index, rotation), expected);
  }
  assert.equal(getDialRotation(1), 0);
  assert.equal(getDialRotation(2), -90);
  assert.equal(getDialRotation(4), 90);
});

test("invalid indices default to cover one", async () => {
  const { getDialRotation } = await getMath();
  for (const index of [
    undefined,
    null,
    0,
    -1,
    5,
    1.5,
    NaN,
    Infinity,
    "2",
    true,
    {},
    [],
    2n,
    Symbol("index"),
  ]) {
    assert.equal(getDialRotation(index), 0);
    assert.equal(getDialRotation(index, -359.5), -360);
    assert.equal(getDialRotation(index, 720.25), 720);
  }
});

test("target rotations are nearest equivalents across many turns", async () => {
  const { getDialRotation } = await getMath();
  for (let index = 1; index <= 4; index += 1) {
    const base = -(index - 1) * 90;
    for (let rotation = -1440.25; rotation <= 1440.25; rotation += 7.5) {
      const result = getDialRotation(index, rotation);
      const distance = Math.abs(result - rotation);
      assert.ok(Number.isFinite(result));
      assert.equal(Math.abs((result - base) % 360), 0);
      assert.ok(distance <= 180);
      for (let turns = -6; turns <= 6; turns += 1) {
        assert.ok(distance <= Math.abs(base + turns * 360 - rotation));
      }
    }
  }
});

test("extreme finite rotations do not overflow during snapping", async () => {
  const { getDialRotation, snapDialRotation } = await getMath();
  for (const rotation of [Number.MAX_VALUE, -Number.MAX_VALUE]) {
    for (let index = 1; index <= 4; index += 1) {
      assert.equal(getDialRotation(index, rotation), rotation);
      assert.equal(snapDialRotation(rotation, [index]), rotation);
    }
  }
});

test("snapping selects a ready cover at its nearest equivalent angle", async () => {
  const { snapDialRotation } = await getMath();
  for (const [rotation, available, expected] of [
    [-359, undefined, -360],
    [350, undefined, 360],
    [-89.75, undefined, -90],
    [725.5, undefined, 720],
    [350, [2], 270],
    [-359, [2], -450],
    [-180, [4, 2], -90],
    [-45, [2, 1], 0],
  ]) {
    assert.equal(snapDialRotation(rotation, available), expected);
  }
});

test("snapping preserves finite rotation when no covers are ready", async () => {
  const { snapDialRotation } = await getMath();
  for (const rotation of [0, -0, -359.25, 1080.5, Number.MAX_VALUE]) {
    for (const available of [[], [0, 5, "1"], null, {}]) {
      assert.equal(snapDialRotation(rotation, available), rotation);
    }
  }
});

test("all availability subsets agree with an exhaustive nearest-angle search", async () => {
  const { getDialIndex, snapDialRotation } = await getMath();
  for (let mask = 0; mask < 16; mask += 1) {
    const available = [4, 3, 2, 1].filter((index) => mask & (1 << (index - 1)));
    for (let rotation = -1080; rotation <= 1080; rotation += 22.5) {
      let expected = null;
      let distance = Infinity;
      for (const index of available) {
        for (let turns = -5; turns <= 5; turns += 1) {
          const candidate = -(index - 1) * 90 + turns * 360;
          const candidateDistance = Math.abs(candidate - rotation);
          if (
            candidateDistance < distance ||
            (candidateDistance === distance && index < expected)
          ) {
            expected = index;
            distance = candidateDistance;
          }
        }
      }
      assert.equal(getDialIndex(rotation, available), expected);
      const snapped = snapDialRotation(rotation, available);
      if (expected === null) {
        assert.equal(snapped, rotation);
      } else {
        assert.equal(Math.abs(snapped - rotation), distance);
        assert.equal(Math.abs((snapped + (expected - 1) * 90) % 360), 0);
      }
    }
  }
});
