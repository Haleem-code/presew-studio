import { expect, test } from "bun:test";
import { constrainView, pinchScale } from "./preview-state";

test("keeps a contained portrait centered and bounds panning after zoom", () => {
  expect(constrainView(1, 200, -200, 200, 400, 400, 500)).toEqual({ scale: 1, x: 0, y: 0 });
  expect(constrainView(3, 1000, -1000, 200, 400, 400, 500)).toEqual({ scale: 3, x: 100, y: -350 });
  expect(constrainView(0, NaN, Infinity, 200, 400, 400, 500)).toEqual({ scale: 1, x: 0, y: 0 });
});
test("pinching stays continuous within the supported zoom range", () => {
  expect(pinchScale(1.5, 100, 200)).toBe(3);
  expect(pinchScale(3, 100, 800)).toBe(4);
  expect(pinchScale(2, 100, 10)).toBe(1);
  expect(pinchScale(2, 0, 50)).toBe(2);
});
