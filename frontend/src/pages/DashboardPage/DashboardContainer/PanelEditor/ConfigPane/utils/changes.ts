import { isEqual, isPlainObject } from 'lodash-es';

/** `undefined`, `null`, `''`, `false` and `[]` all render as the control's default. */
function isUnset(value: unknown): boolean {
	return (
		value === undefined ||
		value === null ||
		value === '' ||
		value === false ||
		(Array.isArray(value) && value.length === 0)
	);
}

/** Whether two slices differ, treating every unset form as equal (fields compare both ways). */
export function isDifferent(a: unknown, b: unknown): boolean {
	if (isPlainObject(a) || isPlainObject(b)) {
		const left = (isPlainObject(a) ? a : {}) as Record<string, unknown>;
		const right = (isPlainObject(b) ? b : {}) as Record<string, unknown>;
		const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
		return [...keys].some((key) => isDifferent(left[key], right[key]));
	}
	if (isUnset(a) && isUnset(b)) {
		return false;
	}
	return !isEqual(a, b);
}

export interface FieldResetProps {
	changed: boolean;
	onReset: () => void;
}

/** Binds a slice to its saved state; call with the field(s) one control owns. */
export function createFieldResetter<T extends object>(
	value: T | undefined,
	savedValue: T | undefined,
	onChange: (next: T) => void,
): (...keys: (keyof T)[]) => FieldResetProps {
	return (...keys) => ({
		changed: keys.some((key) => isDifferent(value?.[key], savedValue?.[key])),
		onReset: (): void => {
			const next = { ...value } as T;
			keys.forEach((key) => {
				next[key] = savedValue?.[key] as T[keyof T];
			});
			onChange(next);
		},
	});
}
