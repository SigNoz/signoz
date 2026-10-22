import { IS_DEV } from 'lib/env';

const CHROME_DEVTOOLS_TRACK_PERFORMANCE_ENABLED =
	IS_DEV &&
	typeof performance !== 'undefined' &&
	typeof performance.measure === 'function' &&
	typeof performance.now === 'function';

export function chromePerformanceNow(): number {
	return CHROME_DEVTOOLS_TRACK_PERFORMANCE_ENABLED ? performance.now() : 0;
}

export interface ChromePerformanceTrackEntryOptions {
	trackGroup: string;
	track: string;
	color?:
		| 'primary'
		| 'primary-light'
		| 'primary-dark'
		| 'secondary'
		| 'secondary-light'
		| 'secondary-dark'
		| 'tertiary'
		| 'tertiary-light'
		| 'tertiary-dark'
		| 'warning'
		| 'error';
	tooltipText?: string;
	properties?: [string, string][];
}

export function chromePerformanceMeasure(
	name: string,
	start: number,
	{
		trackGroup,
		track,
		color = 'primary',
		tooltipText,
		properties,
	}: ChromePerformanceTrackEntryOptions,
): void {
	if (!CHROME_DEVTOOLS_TRACK_PERFORMANCE_ENABLED) {
		return;
	}
	try {
		performance.measure(name, {
			start,
			detail: {
				devtools: {
					dataType: 'track-entry',
					trackGroup,
					track,
					color,
					tooltipText,
					properties,
				},
			},
		});
	} catch {
		// User Timing rejected detail shape — ignore
	}
}

export function createChromePerformanceInteractionTracker(
	trackGroup: string,
	track: string,
	name: string,
): {
	begin: (id: string) => void;
	end: (id: string) => void;
} {
	const startById = new Map<string, number>();

	return {
		begin(id: string): void {
			if (!CHROME_DEVTOOLS_TRACK_PERFORMANCE_ENABLED) {
				return;
			}
			startById.set(id, performance.now());
		},
		end(id: string): void {
			if (!CHROME_DEVTOOLS_TRACK_PERFORMANCE_ENABLED) {
				return;
			}
			const start = startById.get(id);
			if (start === undefined) {
				return;
			}
			startById.delete(id);
			chromePerformanceMeasure(name, start, {
				trackGroup,
				track,
				color: 'tertiary',
				properties: [['id', id]],
			});
		},
	};
}
