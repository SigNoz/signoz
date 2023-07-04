import { DEFAULT_PER_PAGE_OPTIONS } from './config';
import { Pagination } from './types';

export const checkIsValidPaginationData = (
	{ limit, offset }: Pagination,
	perPageOptions: number[],
): boolean =>
	Boolean(
		Number.isInteger(limit) &&
			limit > 0 &&
			offset >= 0 &&
			perPageOptions.find((option) => option === limit),
	);

export const getDefaultPaginationConfig = (
	perPageOptions = DEFAULT_PER_PAGE_OPTIONS,
): Pagination => ({
	offset: 0,
	limit: perPageOptions[0],
});
