import { MouseEventHandler } from 'react';
import { ILog } from 'types/api/logs/log';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';

export type LogTimeRange = {
	start: number;
	end: number;
};

export type UseCopyLogLink = {
	isHighlighted: boolean;
	isLogsExplorerPage: boolean;
	activeLogId: string | null;
	onLogCopy: MouseEventHandler<HTMLElement>;
	onClearActiveLog: () => void;
};

export type UseActiveLog = {
	activeLog: ILog | null;
	onSetActiveLog: (log: ILog) => void;
	onClearActiveLog: () => void;
	onAddToQuery: (
		fieldKey: string,
		fieldValue: string,
		operator: string,
		dataType?: DataTypes,
	) => void;
	onGroupByAttribute: (fieldKey: string, dataType?: DataTypes) => Promise<void>;
};
