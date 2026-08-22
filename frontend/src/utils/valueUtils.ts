const objectToString = Object.prototype.toString;

export function defaultTo<T, D>(
	value: T | null | undefined,
	defaultValue: D,
): Exclude<T, null | undefined> | D {
	return (isNil(value) || isNaN(value) ? defaultValue : value) as
		| Exclude<T, null | undefined>
		| D;
}

export function isArray(value: unknown): value is unknown[] {
	return Array.isArray(value);
}

export function isBoolean(value: unknown): value is boolean {
	return (
		value === true ||
		value === false ||
		objectToString.call(value) === '[object Boolean]'
	);
}

export function isFinite(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value);
}

export function isFunction(
	value: unknown,
): value is (...args: never[]) => unknown {
	return typeof value === 'function';
}

export function isNaN(value: unknown): boolean {
	return isNumber(value) && Number.isNaN(Number(value));
}

export function isNil(value: unknown): value is null | undefined {
	return value === null || value === undefined;
}

export function isNull(value: unknown): value is null {
	return value === null;
}

export function isNumber(value: unknown): value is number {
	return (
		typeof value === 'number' || objectToString.call(value) === '[object Number]'
	);
}

export function isString(value: unknown): value is string {
	return (
		typeof value === 'string' || objectToString.call(value) === '[object String]'
	);
}

export function isUndefined(value: unknown): value is undefined {
	return value === undefined;
}

export function keys(value: unknown): string[] {
	return isNil(value) ? [] : Object.keys(Object(value));
}

export function noop(): void {}
