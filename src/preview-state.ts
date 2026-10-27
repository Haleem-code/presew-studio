export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value)) || 0;
export function constrainView(
  scale: number,
  x: number,
  y: number,
  imageWidth: number,
  imageHeight: number,
  stageWidth: number,
  stageHeight: number,
) {
  const zoom = clamp(Number.isFinite(scale) ? scale : 1, 1, 4);
  const limitX = Math.max(0, (imageWidth * zoom - stageWidth) / 2);
  const limitY = Math.max(0, (imageHeight * zoom - stageHeight) / 2);
  return {
    scale: zoom,
    x: clamp(Number.isFinite(x) ? x : 0, -limitX, limitX),
    y: clamp(Number.isFinite(y) ? y : 0, -limitY, limitY),
  };
}
export function pinchScale(startScale: number, startDistance: number, distance: number) {
  return clamp(startDistance > 0 ? (startScale * distance) / startDistance : startScale, 1, 4);
}
