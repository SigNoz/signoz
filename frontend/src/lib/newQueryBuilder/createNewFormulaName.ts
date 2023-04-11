export const MAX_FORMULAS = 20;

const currentArray: string[] = Array.from(
	Array(MAX_FORMULAS),
	(_, i) => `F${i + 1}`,
);

export const createNewFormulaName = (index: number): string =>
	currentArray[index];
