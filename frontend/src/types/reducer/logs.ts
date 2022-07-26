import { ILogQLParsedQueryItem } from 'lib/logql/types';
import { IFields } from 'types/api/logs/fields';
import { ILog } from 'types/api/logs/log';

export interface ILogsReducer {
	fields: IFields;
	searchFilter: {
		queryString: string;
		parsedQuery: ILogQLParsedQueryItem[];
	};
	logs: ILog[];
	logLinesPerPage: number;
}

export default ILogsReducer;
