import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

type SetupPaginationQueryDataParams = {
	page: number;
	pageSize: number;
};

type SetupPaginationQueryData = (
	params: SetupPaginationQueryDataParams,
) => Partial<IBuilderQuery>;

export const getPaginationQueryData: SetupPaginationQueryData = ({
	page,
	pageSize,
}) => {
	const offset = (page - 1) * pageSize;

	return {
		offset,
		pageSize,
	};
};
