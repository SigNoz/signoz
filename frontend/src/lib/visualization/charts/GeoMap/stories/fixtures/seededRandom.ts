/** Deterministic, so fixtures and screenshots are stable across runs. */
export function seededRandom(seed: number): () => number {
	let state = seed;
	return (): number => {
		state = (state * 1664525 + 1013904223) % 4294967296;
		return state / 4294967296;
	};
}
