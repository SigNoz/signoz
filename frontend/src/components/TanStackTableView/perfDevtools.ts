import {
	createInteractionTracker,
	measureTrack as measureTrackLib,
	perfNow,
	TrackEntryOptions,
} from 'lib/perfDevtools';

export { perfNow };

const TABLE_TRACK_GROUP = 'SigNoz Table';

export function measureTrack(
	name: string,
	start: number,
	{
		track,
		color,
		tooltipText,
		properties,
	}: Omit<TrackEntryOptions, 'trackGroup'>,
): void {
	measureTrackLib(name, start, {
		trackGroup: TABLE_TRACK_GROUP,
		track,
		color,
		tooltipText,
		properties,
	});
}

const hoverTracker = createInteractionTracker(
	TABLE_TRACK_GROUP,
	'Hover',
	'Row hover',
);

export const beginHover = hoverTracker.begin;
export const endHover = hoverTracker.end;
