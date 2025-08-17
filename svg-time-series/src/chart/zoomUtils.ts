export function validateScaleExtent(extent: unknown): [number, number] {
  const error = () =>
    new Error(
      `scaleExtent must be two finite, positive numbers where extent[0] < extent[1]. Received: ${
        Array.isArray(extent) ? `[${extent.join(",")}]` : String(extent)
      }`,
    );

  if (!Array.isArray(extent) || extent.length !== 2) {
    throw error();
  }

  const [min, max] = extent as [unknown, unknown];

  if (
    typeof min !== "number" ||
    typeof max !== "number" ||
    !Number.isFinite(min) ||
    !Number.isFinite(max)
  ) {
    throw error();
  }

  if (min <= 0 || max <= 0) {
    throw error();
  }

  if (min >= max) {
    throw error();
  }

  return [min, max];
}
