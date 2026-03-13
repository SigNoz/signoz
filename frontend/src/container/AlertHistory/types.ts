export enum AlertDetailsTab {
	OVERVIEW = 'OVERVIEW',
	HISTORY = 'HISTORY',
}

export enum TimelineTab {
	OVERALL_STATUS = 'OVERALL_STATUS',
	TOP_5_CONTRIBUTORS = 'TOP_5_CONTRIBUTORS',
}

export enum TimelineFilter {
	ALL = 'ALL',
	FIRED = 'FIRED',
	RESOLVED = 'RESOLVED',
	RECOVERING = 'RECOVERING',
}

export type TimeLineFilterState = `${TimelineFilter}`;

export type FilterStateReturn = 'normal' | 'firing' | 'recovering';
