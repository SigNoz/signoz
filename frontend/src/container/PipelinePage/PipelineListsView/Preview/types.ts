import { ILog } from 'types/api/logs/log';

export interface LogsResponse {
	isLoading: boolean;
	isError: boolean;
	logs: ILog[];
}
