/** Makes a download filename safe across OSes; falls back when empty. */
export function toSafeFileName(name: string): string {
	const trimmed = name.trim();
	if (!trimmed) {
		return 'panel';
	}
	return trimmed.replace(/[\\/:*?"<>|]+/g, '-');
}
