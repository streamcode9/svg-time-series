export function assertPositiveInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
}

export function assertFiniteNumber(value: number, name: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be a finite number`);
  }
}

export function assertTupleSize(
  value: unknown,
  size: number,
  name: string,
): asserts value is unknown[] {
  if (!Array.isArray(value) || value.length !== size) {
    throw new Error(`${name} must be a tuple of size ${String(size)}`);
  }
}

export function assertPositiveFinite(
  value: unknown,
  name: string,
): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a finite, positive number`);
  }
}
