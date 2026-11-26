// Normalize BE query-parse error messages for display:
//   - Drop the "invalid filter query:" prefix (the UI already says "Invalid query").
//   - Backticks → double quotes for the format hint that follows the em-dash.
//   - Trim surrounding whitespace.
export const formatQueryErrorMessage = (raw: string | undefined): string => {
	if (!raw) {
		return '';
	}
	return raw
		.replace(/^invalid filter query:\s*/i, '')
		.replace(/`([^`]+)`/g, '"$1"')
		.trim();
};
