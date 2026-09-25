/**
 * Resolves a legend template by replacing `{{key}}` placeholders with the
 * corresponding label values. Unmatched placeholders are left as-is.
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
 * Resolves the display label for a set of series labels. With a legend template
 * it interpolates `{{key}}` placeholders. Otherwise: a single label shows just
 * its value (no `key=` noise); multiple labels join as `key=value` pairs.
 */
export function resolveLabelFromLabels(
	labels: Record<string, string>,
	legendTemplate?: string,
): string {
	if (legendTemplate) {
		return resolveLegendTemplate(legendTemplate, labels);
	}

	const entries = Object.entries(labels);
	if (entries.length === 0) {
		return '';
	}
	if (entries.length === 1) {
		return entries[0][1];
	}
	return entries.map(([key, value]) => `${key}=${value}`).join(', ');
}
