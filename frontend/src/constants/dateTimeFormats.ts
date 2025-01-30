export const DATE_TIME_FORMATS = {
	// ISO formats (YYYY-MM-DD)
	ISO_DATETIME: 'YYYY-MM-DD HH:mm',
	ISO_DATETIME_SECONDS: 'YYYY-MM-DD HH:mm:ss',
	ISO_DATETIME_MS: 'YYYY-MM-DD HH:mm:ss.SSS',
	ISO_DATETIME_UTC: 'YYYY-MM-DD HH:mm:ss (UTC Z)',

	// Standard regional formats
	US_DATE: 'MM/DD/YYYY',
	UK_DATETIME: 'DD/MM/YYYY HH:mm',
	UK_DATETIME_SECONDS: 'DD/MM/YYYY HH:mm:ss',

	// US_DATE: 'MM/DD/YYYY',
	US_DATETIME: 'MM/DD/YYYY, HH:mm',
	US_DATETIME_SECONDS: 'MM/DD/YYYY, HH:mm:ss',

	// Slash formats
	SLASH_DATETIME: 'YYYY/MM/DD HH:mm',
	SLASH_DATETIME_SECONDS: 'YYYY/MM/DD HH:mm:ss',
	SLASH_SHORT: 'MM/DD HH:mm',

	// Time only formats
	TIME: 'HH:mm',
	TIME_SECONDS: 'HH:mm:ss',
	TIME_UTC: 'HH:mm:ss (UTC Z)',
	TIME_UTC_MS: 'HH:mm:ss.SSS (UTC Z)',

	// Short date formats
	DATE_SHORT: 'MM/DD',
	YEAR_SHORT: 'YY',
	YEAR_MONTH: 'YY-MM',

	// Month name formats
	MONTH_DATE_FULL: 'MMMM DD, YYYY',
	MONTH_DATE_SHORT: 'DD MMM YYYY',
	MONTH_DATETIME_SHORT: 'DD MMM YYYY HH:mm',
	MONTH_YEAR: 'MMM DD YYYY',
	MONTH_DATETIME: 'MMM DD, YYYY, HH:mm',
	MONTH_DATETIME_SECONDS: 'MMM DD YYYY HH:mm:ss',
	MONTH_DATETIME_FULL: 'MMMM DD, YYYY HH:mm',
	MONTH_DATETIME_FULL_SECONDS: 'MMM DD, YYYY, HH:mm:ss',

	// Ordinal formats (1st, 2nd, 3rd, etc)
	ORDINAL_DATE: 'Do MMM YYYY',
	ORDINAL_ONLY: 'Do',
	ORDINAL_DATETIME: 'Do MMMM, YYYY ⎯ HH:mm:ss',

	// UTC specific formats
	UTC_FULL: 'DD/MM/YYYY HH:mm:ss (UTC Z)',
	UTC_US: 'MM/DD/YYYY HH:mm:ss (UTC Z)',
	UTC_US_MS: 'MM/DD/YYYY, HH:mm:ss.SSS (UTC Z)',
	UTC_MONTH_FULL: 'MMMM DD, YYYY HH:mm (UTC Z)',
	UTC_MONTH_SHORT: 'MMM DD HH:mm:ss.SSS (UTC Z)',
	UTC_MONTH_COMPACT: 'MMM DD,YYYY, HH:mm (UTC Z)',
	UTC_TIME_DATE: 'HH:mm:ss (UTC Z) MM/DD',

	// Formats with dash separator
	DASH_DATETIME: 'MMM D, YYYY ⎯ HH:mm:ss',
	DASH_DATETIME_UTC: 'MMM D, YYYY ⎯ HH:mm:ss (UTC Z)',
	DASH_TIME_DATE: 'HH:mm:ss ⎯ MMM D, YYYY (UTC Z)',
} as const;

export const convert24hTo12h = (format: string): string =>
	format
		.replace(/\bHH:mm:ss\.SSS\b/g, 'hh:mm:ss.SSS A')
		.replace(/\bHH:mm:ss\b/g, 'hh:mm:ss A')
		.replace(/\bHH:mm\b/g, 'hh:mm A')
		.replace(/\bh:mm:ss\b/g, 'h:mm:ss A');
