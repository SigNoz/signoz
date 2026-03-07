import APIError from 'types/api/error';
import { QueryDataV3 } from 'types/api/widgets/getQuery';

export type LogsExplorerTableProps = {
	data: QueryDataV3[];
	isLoading: boolean;
	isError: boolean;
	error?: Error | APIError;
};
