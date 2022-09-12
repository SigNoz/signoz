export const commaValuesParser = (query: string): (string | number)[] => {
	if (!query) {
		return [];
	}
	const match = query.match(/(?:\\,|[^,])+/g) ?? [];

	const options: string[] = match.map((text) => {
		// eslint-disable-next-line no-param-reassign
		text = text.replace(/\\,/g, ',');
		const textMatch = /^(.+)\s:\s(.+)$/g.exec(text) ?? [];
		if (textMatch.length === 3) {
			const [, , value] = textMatch;
			return value.trim();
		}
		return text.trim();
	});
	return options.map((option): string | number =>
		Number.isNaN(Number(option)) ? option : Number(option),
	);
};
