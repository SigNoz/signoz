import { useEffect, useMemo, useRef } from 'react';
import logEvent from 'api/common/logEvent';
import { convertToApiError } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import { useListRulesV3 } from 'api/generated/services/rules';
import type {
	ListRulesV3200,
	ListRulesV3Params,
	RenderErrorResponseDTO,
	RuletypesLabelPairDTO,
} from 'api/generated/services/sigNoz.schemas';
import type { AxiosError } from 'axios';
import { GeneratedAPIInstance } from 'api/generatedAPIInstance';
import { isUndefined } from 'lodash-es';

import type { AlertRule } from './types';
import { RULE_LIST_INVALID_ERROR_CODES } from './utils';

interface UseAlertRulesDataReturn {
	rules: AlertRule[];
	total: number;
	/** Label pairs across the org's rules, for DSL autocomplete. */
	labels: RuletypesLabelPairDTO[];
	reservedKeywords: string[] | undefined;
	isFetching: boolean;
	/** A failure other than an invalid filter query. */
	isError: boolean;
	/** The backend's message when the filter query is invalid. */
	queryError: string | null;
	refetch: () => void;
}

export function useAlertRulesData(
	params: ListRulesV3Params,
): UseAlertRulesDataReturn {
	const hasLoggedEvent = useRef(false);

	const rulesResponse = useListRulesV3(params, {
		query: {
			keepPreviousData: true,
			// The backend binds repeated `states=` keys; axios' default sends `states[]=`.
			queryFn: ({ signal }) =>
				GeneratedAPIInstance<ListRulesV3200>({
					url: '/api/v3/rules',
					method: 'GET',
					params,
					paramsSerializer: { indexes: null },
					signal,
				}),
		},
	});

	const rules = useMemo(
		() => rulesResponse.data?.data.rules ?? [],
		[rulesResponse.data],
	);
	const total = rulesResponse.data?.data.total ?? 0;
	const labels = useMemo(
		() => rulesResponse.data?.data.labels ?? [],
		[rulesResponse.data],
	);

	useEffect(() => {
		if (!hasLoggedEvent.current && !isUndefined(rulesResponse.data?.data)) {
			void logEvent('Alert: List page visited', {
				number: total,
			});
			hasLoggedEvent.current = true;
		}
	}, [rulesResponse.data, total]);

	const apiError = useMemo(
		() =>
			convertToApiError(
				rulesResponse.error as AxiosError<RenderErrorResponseDTO> | null,
			),
		[rulesResponse.error],
	);
	const errorCode = apiError?.getErrorCode();
	const isQueryError =
		!!errorCode && RULE_LIST_INVALID_ERROR_CODES.includes(errorCode);

	return {
		rules: isQueryError ? [] : rules,
		total: isQueryError ? 0 : total,
		labels,
		reservedKeywords: rulesResponse.data?.data.reservedKeywords,
		isFetching: rulesResponse.isFetching,
		isError: rulesResponse.isError && !isQueryError,
		queryError: isQueryError ? (apiError?.getErrorMessage() ?? null) : null,
		refetch: rulesResponse.refetch,
	};
}
