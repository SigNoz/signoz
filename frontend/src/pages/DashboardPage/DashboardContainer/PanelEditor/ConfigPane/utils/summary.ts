export function countSummary(
	items: unknown[] | undefined,
	noun: string,
): string {
	const count = items?.length ?? 0;
	if (count === 0) {
		return '';
	}
	return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

export function joinSummary(parts: (string | false | undefined)[]): string {
	return parts.filter(Boolean).join(' · ');
}
