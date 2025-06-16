type FormatDateOptions = {
	year?: 'numeric' | '2-digit';
	month?: 'numeric' | '2-digit' | 'long' | 'short' | 'narrow';
	day?: 'numeric' | '2-digit';
	weekday?: 'long' | 'short' | 'narrow';
	era?: 'long' | 'short';
	timeZoneName?: 'long' | 'short';
	hour?: 'numeric' | '2-digit';
	minute?: 'numeric' | '2-digit';
	second?: 'numeric' | '2-digit';
	timeZone?: string;
};

/**
 * Formats a given date string into a human-readable date format.
 *
 * The function allows for customization of the date format through the `locale` and `options` parameters.
 * By default, it formats the date as "Month Day, Year" (e.g., June 10, 2025).
 * You can customize the format (e.g., `10 June 2025`, `2025-06-10`), the locale (e.g., `en-GB`, `en-US`),
 * and the specific parts of the date to be displayed (e.g., weekday, hour, minute).
 *
 * @param {string} dateString - The input date string that needs to be formatted (e.g., "2025-06-10").
 * @param {string} [locale='en-US'] - The locale for formatting the date (default is `'en-US'`).
 * @param {FormatDateOptions} [options={ year: 'numeric', month: 'long', day: 'numeric' }]
 *        - The options to customize the date format, such as displaying the month in full or abbreviated form.
 *        The default is `{ year: 'numeric', month: 'long', day: 'numeric' }` (e.g., "June 10, 2025").
 *
 * @returns {string} - The formatted date string according to the provided locale and options.
 */
export function formatDate(
	dateString: string,
	locale = 'en-US',
	options: FormatDateOptions = {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	},
): string {
	const date = new Date(dateString);
	return date.toLocaleDateString(locale, options);
}
