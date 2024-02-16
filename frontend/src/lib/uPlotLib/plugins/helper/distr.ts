/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable no-nested-ternary */
export function roundDec(val: number, dec: number): number {
	return Math.round(val * 10 ** dec) / dec;
}

export const SPACE_BETWEEN = 1;
export const SPACE_AROUND = 2;
export const SPACE_EVENLY = 3;

const coord = (i: number, offs: number, iwid: number, gap: number): number =>
	roundDec(offs + i * (iwid + gap), 6);

export function distr(
	numItems: number,
	sizeFactor: number,
	justify: number,
	onlyIdx: number | null,
	each: (idx: number, coord: number, iwid: number) => void,
): void {
	const space = 1 - sizeFactor;

	let gap =
		justify === SPACE_BETWEEN
			? space / (numItems - 1)
			: justify === SPACE_AROUND
			? space / numItems
			: justify === SPACE_EVENLY
			? space / (numItems + 1)
			: 0;

	if (Number.isNaN(gap) || gap === Infinity) gap = 0;

	const offs =
		justify === SPACE_BETWEEN
			? 0
			: justify === SPACE_AROUND
			? gap / 2
			: justify === SPACE_EVENLY
			? gap
			: 0;

	const iwid = sizeFactor / numItems;
	const roundDecNumber = roundDec(iwid, 6);

	if (onlyIdx === null) {
		for (let i = 0; i < numItems; i++)
			each(i, coord(i, offs, iwid, gap), roundDecNumber);
	} else each(onlyIdx, coord(onlyIdx, offs, iwid, gap), roundDecNumber);
}
