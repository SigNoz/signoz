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

/**
 * Whether `value` differs from the default it renders over. Objects compare field-wise,
 * so an unset or explicit-but-default field doesn't count.
 */
export function isChanged(value: unknown, defaultValue: unknown): boolean {
	if (isPlainObject(value)) {
		const defaults = (isPlainObject(defaultValue) ? defaultValue : {}) as Record<
			string,
			unknown
		>;
		return Object.entries(value as Record<string, unknown>).some(([key, field]) =>
			isChanged(field, defaults[key]),
		);
	}
	return !isUnset(value) && !isEqual(value, defaultValue);
}

export interface FieldResetProps {
	changed: boolean;
	onReset: () => void;
}

/** Binds a slice to its defaults; call with the field(s) one control owns. */
export function createFieldResetter<T extends object>(
	value: T | undefined,
	defaultValue: T | undefined,
	onChange: (next: T) => void,
): (...keys: (keyof T)[]) => FieldResetProps {
	return (...keys) => ({
		changed: keys.some((key) => isChanged(value?.[key], defaultValue?.[key])),
		onReset: (): void => {
			const next = { ...value } as T;
			keys.forEach((key) => {
				next[key] = defaultValue?.[key] as T[keyof T];
			});
			onChange(next);
		},
	});
}
