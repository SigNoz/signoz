// Every test loads the mock data through jest.setup.ts. Importing enum values
// here would make a change to their source file rerun the whole suite, so mocks
// write enum members as string literals, type-checked through this type.
export type Literal<T> = T extends string
	? `${T}`
	: T extends (infer U)[]
		? Literal<U>[]
		: T extends object
			? { [K in keyof T]: Literal<T[K]> }
			: T;
