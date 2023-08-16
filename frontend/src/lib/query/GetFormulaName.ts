import { sortBy } from 'lodash-es';

const MAX_QUERIES = 20;

function GetFormulaName(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	formulas: { name: string; [key: string]: any }[] = [],
): string | null {
	if (!formulas.length) return 'F1';
	if (formulas.length === MAX_QUERIES) {
		return null;
	}
	const formulasNameNumbered = sortBy(
		formulas.map(({ name }: { name: string }) => parseInt(name.slice(1), 10)),
		(e) => e,
	);

	// let formulaIteratorIdx = 0;

	for (let charItr = 1; charItr <= MAX_QUERIES; charItr += 1) {
		if (!formulasNameNumbered.includes(charItr)) {
			return `F${charItr}`;
		}
		// formulaIteratorIdx += 1;
	}
	return null;
}

export default GetFormulaName;
