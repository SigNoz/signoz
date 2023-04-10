export const MAX_QUERIES = 26;

const alpha: number[] = Array.from(Array(MAX_QUERIES), (_, i) => i + 65);
const alphabet: string[] = alpha.map((str) => String.fromCharCode(str));

export const createNewQueryName = (existNames: string[]): string => {
	for (let i = 0; i < alphabet.length; i += 1) {
		if (!existNames.includes(alphabet[i])) {
			return alphabet[i];
		}
	}

	return '';
};
