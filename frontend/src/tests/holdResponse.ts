export interface HeldResponse {
	held: Promise<void>;
	release: () => void;
}

export function holdResponse(): HeldResponse {
	const { promise, resolve } = Promise.withResolvers<void>();
	return { held: promise, release: (): void => resolve() };
}
