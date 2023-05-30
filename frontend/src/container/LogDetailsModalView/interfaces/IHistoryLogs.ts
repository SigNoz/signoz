import { ILog } from 'types/api/logs/log';

export enum HistoryPosition {
	prev = 'PreviousLogs',
	next = 'NextLogs',
}

export default interface IHistoryLogs {
	fetchLogs: () => void;
	position: HistoryPosition.prev | HistoryPosition.next;
	logs: null | ILog[];
	isLoad: boolean;
}
