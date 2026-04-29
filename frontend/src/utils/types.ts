type Builtin =
	| string
	| number
	| boolean
	| bigint
	| symbol
	| null
	| undefined
	| Function // eslint-disable-line
	| Date
	| RegExp
	| Error;

export type DeepPartial<T> = T extends Builtin
	? T
	: T extends Array<infer U>
		? Array<DeepPartial<U>>
		: T extends ReadonlyArray<infer U>
			? ReadonlyArray<DeepPartial<U>>
			: T extends object
				? { [K in keyof T]?: DeepPartial<T[K]> }
				: T;
