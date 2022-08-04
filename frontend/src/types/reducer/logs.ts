import { ILogQLParsedQueryItem } from 'lib/logql/types';
import { IFields } from 'types/api/logs/fields';
import { ILog } from 'types/api/logs/log';
import { ILogsAggregate } from 'types/api/logs/logAggregate';

export interface ILogsReducer {
	fields: IFields;
	searchFilter: {
		queryString: string;
		parsedQuery: ILogQLParsedQueryItem[];
	};
	logs: ILog[];
	logLinesPerPage: number;
	idEnd: string;
	idStart: string;
	isLoading: boolean;
	isLoadingAggregate: boolean;
	logsAggregate: ILogsAggregate[];
	selectedLogId: string;
	detailedLog: null | ILog;
	liveTail: boolean;
}

export default ILogsReducer;
