import { SeriesItem } from 'types/api/widgets/getQuery';

/**
 * Resolves a legend template by replacing {{key}} placeholders with
 * corresponding label values. Unmatched placeholders are left as-is.
 *
 * @param template - Template string containing {{key}} placeholders
 * @param labels - Map of label keys to values
 * @returns Resolved string with matched placeholders replaced
 */
export function resolveLegendTemplate(
	template: string,
	labels: Record<string, string>,
): string {
	return template.replace(/\{\{([^}]+)\}\}/g, (match, key: string) => {
		const trimmedKey = key.trim();
		if (trimmedKey in labels) {
			return labels[trimmedKey];
		}
		return match;
	});
}

/**
 * Resolves the display label for a series. If a legend template is provided,
 * it interpolates the template with the series labels. Otherwise, falls back
 * to joining label key=value pairs.
 *
 * @param series - The series item containing labels
 * @param legendTemplate - Optional legend template string with {{key}} placeholders
 * @returns Resolved series label string
 */
export function resolveSeriesLabel(
	series: SeriesItem,
	legendTemplate?: string,
): string {
	if (legendTemplate) {
		return resolveLegendTemplate(legendTemplate, series.labels);
	}

	const entries = Object.entries(series.labels);
	if (entries.length === 0) {
		return '';
	}

	return entries.map(([key, value]) => `${key}=${value}`).join(', ');
}
