import { ILogV3 } from 'types/api/logs/log';

export enum HistoryPosition {
	prev = 'PreviousLogs',
	next = 'NextLogs',
}

export default interface IHistoryLogs {
	addMoreLogs: () => void;
	position: HistoryPosition.prev | HistoryPosition.next;
	logs: null | ILogV3[];
	isLoad: boolean;
	isError: boolean;
}
