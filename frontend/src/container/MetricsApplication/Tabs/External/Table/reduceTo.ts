export const reduceToVariants = [
	'avg',
	'min',
	'max',
	'p50',
	'p90',
	'p95',
	'p99',
	'latest',
] as const;
export type ReduceToVariant = typeof reduceToVariants[number];

export function min(ns: number[]): number {
	if (ns.length === 0) {
		throw new Error('Cannot get min of empty array');
	}

	let result = ns[0];

	for (let i = 0; i < ns.length; i += 1) {
		if (ns[i] < result) {
			result = ns[i];
		}
	}

	return result;
}

export function max(ns: number[]): number {
	if (ns.length === 0) {
		throw new Error('Cannot get max of empty array');
	}

	let result = ns[0];

	for (let i = 0; i < ns.length; i += 1) {
		if (ns[i] > result) {
			result = ns[i];
		}
	}

	return result;
}

export function avg(ns: number[]): number {
	if (ns.length === 0) {
		throw new Error('Cannot get avg of empty array');
	}

	let sum = 0;

	for (let i = 0; i < ns.length; i += 1) {
		sum += ns[i];
	}

	return sum / ns.length;
}

// Source: https://stackoverflow.com/a/55297611/4182882
export function quantile(ns: number[], q: number): number {
	if (ns.length === 0) {
		throw new Error('Cannot calculate quantile of empty array');
	}

	if (q < 0 || q > 1) {
		throw new Error(`Quantile ${q} should be between 0 and 1`);
	}

	const sorted = ns.sort((a, b) => a - b);
	const pos = (sorted.length - 1) * q;
	const base = Math.floor(pos);
	const rest = pos - base;
	if (sorted[base + 1] !== undefined) {
		return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
	}

	return sorted[base];
}

export function p50(ns: number[]): number {
	return quantile(ns, 0.5);
}

export function p90(ns: number[]): number {
	return quantile(ns, 0.9);
}

export function p95(ns: number[]): number {
	return quantile(ns, 0.95);
}

export function p99(ns: number[]): number {
	return quantile(ns, 0.99);
}

export function latest(ns: number[]): number {
	if (ns.length === 0) {
		throw new Error('Cannot get latest of empty array');
	}

	return ns[ns.length - 1];
}

export function pickFn(reduceTo: ReduceToVariant): (ns: number[]) => number {
	return {
		min,
		max,
		avg,
		p50,
		p90,
		p95,
		p99,
		latest,
	}[reduceTo];
}
