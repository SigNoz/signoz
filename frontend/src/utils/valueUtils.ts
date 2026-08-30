const symbolToStringTag =
	typeof Symbol !== 'undefined' ? Symbol.toStringTag : undefined;

function hasOwn(value: object, key: PropertyKey): boolean {
	return Object.prototype.hasOwnProperty.call(value, key);
}

function nativeObjectToString(value: unknown): string {
	return Object.prototype.toString.call(value);
}

function objectToString(value: unknown): string {
	if (symbolToStringTag === undefined || isNil(value)) {
		return nativeObjectToString(value);
	}

	const objectValue = Object(value) as Record<PropertyKey, unknown>;

	if (!(symbolToStringTag in objectValue)) {
		return nativeObjectToString(value);
	}

	const isOwn = hasOwn(objectValue, symbolToStringTag);
	const tag = objectValue[symbolToStringTag];
	let unmasked = false;

	try {
		objectValue[symbolToStringTag] = undefined;
		unmasked = true;
	} catch {
		// Ignore read-only Symbol.toStringTag values.
	}

	const result = nativeObjectToString(value);

	if (unmasked) {
		if (isOwn) {
			objectValue[symbolToStringTag] = tag;
		} else {
			delete objectValue[symbolToStringTag];
		}
	}

	return result;
}

export function defaultTo<T, D>(
	value: T | null | undefined,
	defaultValue: D,
): Exclude<T, null | undefined> | D {
	return (isNil(value) || value !== value ? defaultValue : value) as
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
		objectToString(value) === '[object Boolean]'
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
		typeof value === 'number' || objectToString(value) === '[object Number]'
	);
}

export function isString(value: unknown): value is string {
	return (
		typeof value === 'string' || objectToString(value) === '[object String]'
	);
}

export function isUndefined(value: unknown): value is undefined {
	return value === undefined;
}

export function keys(value: unknown): string[] {
	return isNil(value) ? [] : Object.keys(Object(value));
}

export function noop(): void {}
