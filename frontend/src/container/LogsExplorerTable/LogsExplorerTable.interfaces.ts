import { QueryDataV3 } from 'types/api/widgets/getQuery';

export type LogsExplorerTableProps = {
	data: QueryDataV3[];
	isLoading: boolean;
	isError: boolean;
};
