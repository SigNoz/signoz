import { QueryData, QueryDataV3 } from 'types/api/widgets/getQuery';

export type QueryHistoryState = {
	graphQueryPayload: QueryData[];
	listQueryPayload: QueryDataV3[];
};
