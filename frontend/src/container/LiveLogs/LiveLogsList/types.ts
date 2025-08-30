import { ILog } from 'types/api/logs/log';

export interface ILiveLogsLog {
	data: ILog[];
	timestamp: number;
}

export type LiveLogsListProps = {
	logs: ILiveLogsLog[];
	isLoading: boolean;
};
