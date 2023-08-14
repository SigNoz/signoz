import { MouseEventHandler } from 'react';
import { ILog } from 'types/api/logs/log';

export type LogTimeRange = {
	start: number;
	end: number;
	pageSize: number;
};

export type UseCopyLogLink = {
	isHighlighted: boolean;
	isLogsExplorerPage: boolean;
	activeLogId: string | null;
	timeRange: LogTimeRange | null;
	onLogCopy: MouseEventHandler<HTMLElement>;
	onTimeRangeChange: (newTimeRange: LogTimeRange | null) => void;
};

export type UseActiveLog = {
	activeLog: ILog | null;
	onSetActiveLog: (log: ILog) => void;
	onClearActiveLog: () => void;
	onAddToQuery: (fieldKey: string, fieldValue: string, operator: string) => void;
};
