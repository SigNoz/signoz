import { IS_DEV } from 'lib/env';

export type DevtoolsColor =
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

const PERF_ENABLED =
	IS_DEV &&
	typeof performance !== 'undefined' &&
	typeof performance.measure === 'function' &&
	typeof performance.now === 'function';

export function perfNow(): number {
	return PERF_ENABLED ? performance.now() : 0;
}

export type PerfProperties = [string, string][];

export interface TrackEntryOptions {
	trackGroup: string;
	track: string;
	color?: DevtoolsColor;
	tooltipText?: string;
	properties?: PerfProperties;
}

export function measureTrack(
	name: string,
	start: number,
	{
		trackGroup,
		track,
		color = 'primary',
		tooltipText,
		properties,
	}: TrackEntryOptions,
): void {
	if (!PERF_ENABLED) {
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

export function createInteractionTracker(
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
			if (!PERF_ENABLED) {
				return;
			}
			startById.set(id, performance.now());
		},
		end(id: string): void {
			if (!PERF_ENABLED) {
				return;
			}
			const start = startById.get(id);
			if (start === undefined) {
				return;
			}
			startById.delete(id);
			measureTrack(name, start, {
				trackGroup,
				track,
				color: 'tertiary',
				properties: [['id', id]],
			});
		},
	};
}
