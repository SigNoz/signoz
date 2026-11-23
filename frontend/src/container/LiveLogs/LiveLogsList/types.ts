import type { ChangeViewFunctionType } from 'hooks/useHandleExplorerTabChange';
import type { ILog } from 'types/api/logs/log';

export interface ILiveLogsLog {
	data: ILog[];
	timestamp: number;
}

export type LiveLogsListProps = {
	logs: ILiveLogsLog[];
	isLoading: boolean;
	handleChangeSelectedView?: ChangeViewFunctionType;
};
