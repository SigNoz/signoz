import { ILogQLParsedQueryItem } from 'lib/logql/types';
import { IFields } from 'types/api/logs/fields';

export interface ILogsReducer {
	fields: IFields;
	searchFilter: {
		queryString: string;
		parsedQuery: ILogQLParsedQueryItem[];
	};
}

export default ILogsReducer;
