/** Triggers a browser download of in-memory string content as a file. */
export function downloadFile(
	content: string,
	fileName: string,
	mime: string,
): void {
	const blob = new Blob([content], { type: mime });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = fileName;
	link.click();
	link.remove();
	URL.revokeObjectURL(url);
}

/** `base` + local timestamp + extension, e.g. `logs-timeseries-2026-07-08_14-32-05.csv`.
 * Keeps repeated exports from colliding and records when the export was taken. */
export function getTimestampedFileName(
	base: string,
	extension: string,
): string {
	const now = new Date();
	const pad = (value: number): string => String(value).padStart(2, '0');
	const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
		now.getDate(),
	)}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
	return `${base}-${stamp}.${extension}`;
}
