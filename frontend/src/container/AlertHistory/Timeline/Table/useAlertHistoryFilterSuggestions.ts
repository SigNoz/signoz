import { useCallback, useMemo } from 'react';
import {
	getRuleHistoryFilterValues,
	useGetRuleHistoryFilterKeys,
} from 'api/generated/services/rules';
import { QUERY_BUILDER_KEY_TYPES } from 'constants/antlrQueryConstants';
import { useAlertHistoryQueryParams } from 'pages/AlertDetails/hooks';
import { QueryKeyDataSuggestionsProps } from 'types/api/querySuggestions/types';
import {
	dataTypeToKeyType,
	dataTypeToSuggestionType,
	fieldContextToSuggestionContext,
} from 'container/AlertHistory/Timeline/Table/utils';

export const ALERT_HISTORY_FALLBACK_FILTER_KEYS: QueryKeyDataSuggestionsProps[] =
	[
		{
			label: 'severity',
			name: 'severity',
			type: 'keyword',
			signal: 'logs' as const,
			fieldDataType: QUERY_BUILDER_KEY_TYPES.STRING,
		},
		{
			label: 'threshold.name',
			name: 'threshold.name',
			type: 'keyword',
			signal: 'logs' as const,
			fieldDataType: QUERY_BUILDER_KEY_TYPES.STRING,
		},
	];

export interface AlertHistoryFilterSuggestions {
	hardcodedAttributeKeys: QueryKeyDataSuggestionsProps[];
	valueSuggestionsOverride: (
		key: string,
		searchText: string,
	) => Promise<{
		stringValues?: string[];
		numberValues?: number[];
		complete?: boolean;
	} | null>;
	isLoadingKeys: boolean;
}

export function useAlertHistoryFilterSuggestions(
	ruleId: string | null,
): AlertHistoryFilterSuggestions {
	const { startTime, endTime } = useAlertHistoryQueryParams();

	const { data: filterKeysData, isLoading: isLoadingKeys } =
		useGetRuleHistoryFilterKeys(
			{ id: ruleId ?? '' },
			{ startUnixMilli: startTime, endUnixMilli: endTime },
			{
				query: {
					enabled: !!ruleId,
					refetchOnMount: false,
					refetchOnWindowFocus: false,
				},
			},
		);

	const hardcodedAttributeKeys = useMemo((): QueryKeyDataSuggestionsProps[] => {
		const keys = filterKeysData?.data?.keys;
		if (!keys) {
			return ALERT_HISTORY_FALLBACK_FILTER_KEYS;
		}
		return Object.values(keys).flatMap((items) =>
			items.map((item) => ({
				label: item.name,
				name: item.name,
				type: dataTypeToSuggestionType(item.fieldDataType),
				signal: 'logs' as const,
				fieldDataType: dataTypeToKeyType(item.fieldDataType),
				fieldContext: fieldContextToSuggestionContext(item.fieldContext),
			})),
		);
	}, [filterKeysData]);

	const valueSuggestionsOverride = useCallback(
		async (
			key: string,
			searchText: string,
		): Promise<{
			stringValues?: string[];
			numberValues?: number[];
			complete?: boolean;
		} | null> => {
			if (!ruleId) {
				return null;
			}
			const response = await getRuleHistoryFilterValues(
				{ id: ruleId },
				{
					name: key,
					searchText,
					limit: 10,
					startUnixMilli: startTime,
					endUnixMilli: endTime,
				},
			);
			const values = response.data?.values;
			if (!values) {
				return null;
			}
			return {
				stringValues: values.stringValues ?? [],
				numberValues: values.numberValues ?? [],
				complete: response.data?.complete ?? false,
			};
		},
		[ruleId, startTime, endTime],
	);

	return { hardcodedAttributeKeys, valueSuggestionsOverride, isLoadingKeys };
}
