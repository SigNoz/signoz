/* eslint-disable  */
// @ts-ignore
// @ts-nocheck

export const splitter = (queryString: string): string[] => {
	const splittedParts: string[] = [];
	let start = 0;
	let isBracketStart = false;
	let isQuoteStart = false;

	const pushPart = (idx) => {
		splittedParts.push(queryString.slice(start, idx));
		start = idx + 1;
	};
	for (let idx = 0; idx < queryString.length; idx += 1) {
		const currentChar = queryString[idx];

		if (currentChar === ' ') {
			if (!isBracketStart && !isQuoteStart) {
				pushPart(idx);
			}
		} else if (currentChar === '(') {
			isBracketStart = true;
		} else if (currentChar === ')') {
			if (queryString[idx - 1] !== '\\') {
				pushPart(idx + 1);
				isBracketStart = false;
			}
			if (isQuoteStart) {
				isQuoteStart = false;
			}
		} else if (currentChar === "'") {
			if (isQuoteStart) {
				if (queryString[idx - 1] !== '\\' && !isBracketStart) {
					pushPart(idx + 1);
					isQuoteStart = false;
				}
			} else {
				isQuoteStart = true;
			}
		}
	}

	// Process remaining part
	if (start < queryString.length) {
		pushPart(queryString.length);
	}

	return splittedParts.map((s) => String.raw`${s}`).filter(Boolean);
};

export default splitter;
