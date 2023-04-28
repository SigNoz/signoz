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

function min(ns: number[]): number {
	let result = ns[0];

	for (let i = 0; i < ns.length; i += 1) {
		if (ns[i] < result) {
			result = ns[i];
		}
	}

	return result;
}

function max(ns: number[]): number {
	let result = ns[0];

	for (let i = 0; i < ns.length; i += 1) {
		if (ns[i] > result) {
			result = ns[i];
		}
	}

	return result;
}

function avg(ns: number[]): number {
	let sum = 0;

	for (let i = 0; i < ns.length; i += 1) {
		sum += ns[i];
	}

	return sum / ns.length;
}

// Source: https://stackoverflow.com/a/55297611/4182882
function quantile(ns: number[], q: number): number {
	const sorted = ns.sort((a, b) => a - b);
	const pos = (sorted.length - 1) * q;
	const base = Math.floor(pos);
	const rest = pos - base;
	if (sorted[base + 1] !== undefined) {
		return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
	}

	return sorted[base];
}

function p50(ns: number[]): number {
	return quantile(ns, 0.5);
}

function p90(ns: number[]): number {
	return quantile(ns, 0.9);
}

function p95(ns: number[]): number {
	return quantile(ns, 0.95);
}

function p99(ns: number[]): number {
	return quantile(ns, 0.99);
}

function latest(ns: number[]): number {
	return ns[ns.length - 1];
}

export function pickFn(reduceTo: ReduceToVariant): (ns: number[]) => number {
	let result: (ns: number[]) => number;

	switch (reduceTo) {
		case 'min':
			result = min;
			break;
		case 'max':
			result = max;
			break;
		case 'avg':
			result = avg;
			break;
		case 'p50':
			result = p50;
			break;
		case 'p90':
			result = p90;
			break;
		case 'p95':
			result = p95;
			break;
		case 'p99':
			result = p99;
			break;
		case 'latest':
			result = latest;
			break;
		default:
			throw new Error(`Unknown reduceTo: ${reduceTo}`);
	}

	return result;
}
