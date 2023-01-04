import { GlobalTime } from 'types/actions/globalTime';

export type Order = 'ascending' | 'descending';
export type OrderBy =
	| 'serviceName'
	| 'exceptionCount'
	| 'lastSeen'
	| 'firstSeen'
	| 'exceptionType';

export interface Props {
	start: GlobalTime['minTime'];
	end: GlobalTime['maxTime'];
	order?: Order;
	orderParam?: OrderBy;
	limit?: number;
	offset?: number;
}

export interface Exception {
	exceptionType: string;
	exceptionMessage: string;
	exceptionCount: number;
	lastSeen: string;
	firstSeen: string;
	serviceName: string;
	groupID: string;
}

export type PayloadProps = Exception[];
