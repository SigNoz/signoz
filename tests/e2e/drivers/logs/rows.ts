/** A log row in any list format: Default, Raw or Column. */
export const ROW_SELECTOR = [
	'[data-testid^="logs-list-row-"]',
	'[data-testid^="logs-raw-row-"]',
	'[data-testid^="logs-table-row-"]',
].join(', ');
