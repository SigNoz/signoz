/** The shape code a map element carries in `data-code`. */
export const codeOf = (target: EventTarget): string | null =>
	(target as Element).getAttribute?.('data-code') ?? null;

export const centreOf = (target: EventTarget): [number, number] => {
	const rect = (target as Element).getBoundingClientRect();
	return [rect.left + rect.width / 2, rect.top + rect.height / 2];
};
