import APIError from 'types/api/error';
import { ILog } from 'types/api/logs/log';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

export type LogsExplorerListProps = {
	isLoading: boolean;
	isFetching: boolean;
	currentStagedQueryData: IBuilderQuery | null;
	logs: ILog[];
	onEndReached: (index: number) => void;
	isError: boolean;
	error?: Error | APIError;
	isFilterApplied: boolean;
	isFrequencyChartVisible: boolean;
};
