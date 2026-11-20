/** Compact age of a timestamp: "now", "5m", "3h", "2d", then a short date. */
export function formatRelativeTime(ts: number): string {
	if (!Number.isFinite(ts)) {
		return '';
	}
	const diff = Date.now() - ts;
	const mins = Math.floor(diff / 60_000);
	if (mins < 1) {
		return 'now';
	}
	if (mins < 60) {
		return `${mins}m`;
	}
	const hrs = Math.floor(mins / 60);
	if (hrs < 24) {
		return `${hrs}h`;
	}
	const days = Math.floor(hrs / 24);
	if (days < 7) {
		return `${days}d`;
	}
	return new Date(ts).toLocaleDateString(undefined, {
		month: 'short',
		day: 'numeric',
	});
}
