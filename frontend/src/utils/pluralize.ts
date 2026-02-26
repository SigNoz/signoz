export function pluralize(
	count: number,
	singular: string,
	plural?: string,
): string {
	if (count === 1) {
		return `${count} ${singular}`;
	}
	if (plural) {
		return `${count} ${plural}`;
	}
	return `${count} ${singular}s`;
}
