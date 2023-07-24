import { MouseEventHandler } from 'react';

export type LogTimeRange = {
	start: number;
	end: number;
	pageSize: number;
};

export type UseCopyLogLink = {
	isLogsExplorerPage: boolean;
	activeLogId: string | null;
	timeRange: LogTimeRange | null;
	onLogCopy: MouseEventHandler<HTMLElement>;
	onTimeRangeChange: (newTimeRange: LogTimeRange | null) => void;
};
