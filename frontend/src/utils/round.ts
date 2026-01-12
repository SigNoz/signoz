/**
 * Applies half-up rounding to ensure a whole number.
 * Example: 1.5 → 2, 1.49 → 1
 */
export const roundHalfUp = (value: number): number => Math.floor(value + 0.5);
