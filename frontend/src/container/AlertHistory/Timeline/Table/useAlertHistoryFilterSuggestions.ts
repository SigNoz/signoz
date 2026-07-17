import { useCallback, useMemo } from 'react';
import {
	getRuleHistoryFilterValues,
	useGetRuleHistoryFilterKeys,
} from 'api/generated/services/rules';
import { useAlertHistoryQueryParams } from 'pages/AlertDetails/hooks';
import { QueryKeyDataSuggestionsProps } from 'types/api/querySuggestions/types';
import {
	dataTypeToKeyType,
	dataTypeToSuggestionType,
	fieldContextToSuggestionContext,
} from 'container/AlertHistory/Timeline/Table/utils';

export interface AlertHistoryFilterSuggestions {
	hardcodedAttributeKeys: QueryKeyDataSuggestionsProps[] | undefined;
	valueSuggestionsOverride: (
		key: string,
		searchText: string,
	) => Promise<{ stringValues?: string[]; numberValues?: number[] } | null>;
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

	const hardcodedAttributeKeys = useMemo(():
		| QueryKeyDataSuggestionsProps[]
		| undefined => {
		const keys = filterKeysData?.data?.keys;
		if (!keys) {
			return undefined;
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
		): Promise<{ stringValues?: string[]; numberValues?: number[] } | null> => {
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
			};
		},
		[ruleId, startTime, endTime],
	);

	return { hardcodedAttributeKeys, valueSuggestionsOverride, isLoadingKeys };
}
