// Page size for the model-cost list request / pagination.
export const PAGE_SIZE = 20;

// URL query-param key backing the current page.
export const PAGE_KEY = 'page';

// Number of columns in ModelCostsTable — used as the empty/loading row colSpan.
// Keep in sync with the <TableHead> count in ModelCostsTable.
export const COLUMN_COUNT = 8;

// Only USD is priced today; the others are placeholders for upcoming support.
export const CURRENCY_OPTIONS = [
	{ value: 'USD', label: 'USD' },
	{ value: 'EUR', label: 'EUR', disabled: true },
	{ value: 'INR', label: 'INR', disabled: true },
];
