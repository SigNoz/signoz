import { useMemo } from 'react';
import { convertToApiError } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import { useListServiceAccounts } from 'api/generated/services/serviceaccount';
import type { RenderErrorResponseDTO } from 'api/generated/services/sigNoz.schemas';
import type { ErrorType } from 'api/generatedAPIInstance';

import { SA_LIST_INVALID_ERROR_CODES, SA_PAGE_SIZE } from './constants';
import { ServiceAccountRow, toServiceAccountRow } from './utils';

interface UseServiceAccountsDataArgs {
	query: string;
	page: number;
	enabled: boolean;
}

export interface ServiceAccountsData {
	accounts: ServiceAccountRow[];
	total: number;
	reservedKeywords: string[] | undefined;
	isFetching: boolean;
	isError: boolean;
	error: ErrorType<RenderErrorResponseDTO> | null;
	// The API's rejection of the query itself, shown beside the box rather than in place of the table.
	queryError: string | null;
}

export function useServiceAccountsData({
	query,
	page,
	enabled,
}: UseServiceAccountsDataArgs): ServiceAccountsData {
	const { data, isFetching, isError, error } = useListServiceAccounts(
		{
			limit: SA_PAGE_SIZE,
			offset: (page - 1) * SA_PAGE_SIZE,
			...(query ? { query } : {}),
		},
		{ query: { enabled, keepPreviousData: true } },
	);

	const accounts = useMemo(
		(): ServiceAccountRow[] =>
			(data?.data?.serviceAccounts ?? []).map(toServiceAccountRow),
		[data],
	);

	const apiError = useMemo(() => convertToApiError(error), [error]);
	const errorCode = apiError?.getErrorCode();
	const isQueryError =
		!!errorCode && SA_LIST_INVALID_ERROR_CODES.includes(errorCode);

	return {
		accounts: isQueryError ? [] : accounts,
		total: isQueryError ? 0 : (data?.data?.total ?? 0),
		reservedKeywords: data?.data?.reservedKeywords,
		isFetching,
		isError: isError && !isQueryError,
		error,
		queryError: isQueryError ? (apiError?.getErrorMessage() ?? null) : null,
	};
}
