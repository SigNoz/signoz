import { Pagination } from './types';

export const checkIsValidPaginationData = ({
	limit,
	offset,
}: Pagination): boolean =>
	Boolean(
		limit &&
			(limit === 25 || limit === 50 || limit === 100 || limit === 200) &&
			offset &&
			offset > 0,
	);
