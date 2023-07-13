export const removeJSONStringifyQuotes = (s: string): string => {
	if (!s || !s.length) {
		return s;
	}

	if (s[0] === '"' && s[s.length - 1] === '"') {
		return s.slice(1, s.length - 1);
	}
	return s;
};
