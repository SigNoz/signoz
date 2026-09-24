import {
	createChromePerformanceInteractionTracker,
	chromePerformanceMeasure,
	ChromePerformanceTrackEntryOptions,
} from 'lib/chromePerformanceDevTools';

const TABLE_TRACK_GROUP = 'SigNoz Table';

export function chromePerformanceMeasureTanstackTable(
	name: string,
	start: number,
	{
		track,
		color,
		tooltipText,
		properties,
	}: Omit<ChromePerformanceTrackEntryOptions, 'trackGroup'>,
): void {
	chromePerformanceMeasure(name, start, {
		trackGroup: TABLE_TRACK_GROUP,
		track,
		color,
		tooltipText,
		properties,
	});
}

const hoverTracker = createChromePerformanceInteractionTracker(
	TABLE_TRACK_GROUP,
	'Hover',
	'Row hover',
);

export const chromePerformanceTanstackTableBeginHover = hoverTracker.begin;
export const chromePerformanceTanstackTableEndHover = hoverTracker.end;
