import type { MouseEvent } from 'react';
import type { ScalarFieldValue } from 'utils/stringUtils';
import type { ILog } from 'types/api/logs/log';
import type { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';

export type LogTimeRange = {
	start: number;
	end: number;
};

export type UseCopyLogLink = {
	isHighlighted: boolean;
	isLogsExplorerPage: boolean;
	activeLogId: string | null;
	onLogCopy: (event?: MouseEvent<HTMLElement>) => void;
	onClearActiveLog: () => void;
};

export type UseActiveLog = {
	activeLog: ILog | null;
	onSetActiveLog: (log: ILog) => void;
	onClearActiveLog: () => void;
	onAddToQuery: (
		fieldKey: string,
		fieldValue: ScalarFieldValue,
		operator: string,
		dataType?: DataTypes,
	) => void;
};
