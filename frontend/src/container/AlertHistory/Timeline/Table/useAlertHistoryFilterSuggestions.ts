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
	hardcodedAttributeKeys: QueryKeyDataSuggestionsProps[];
	valueSuggestionsOverride: (
		key: string,
		searchText: string,
	) => Promise<{
		stringValues: string[];
		numberValues: number[];
		complete: boolean;
	}>;
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
			// by default, when QuerySearch keys fails, we don't render fallback keys
			// we just return empty to let user write whatever they want with no
			// key suggestion
			return [];
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
			stringValues: string[];
			numberValues: number[];
			complete: boolean;
		}> => {
			if (!ruleId) {
				return {
					stringValues: [],
					numberValues: [],
					complete: true,
				};
			}
			const response = await getRuleHistoryFilterValues(
				{ id: ruleId },
				{
					name: key,
					searchText,
					startUnixMilli: startTime,
					endUnixMilli: endTime,
				},
			);
			const values = response.data?.values;
			return {
				stringValues: values?.stringValues ?? [],
				numberValues: values?.numberValues ?? [],
				complete: response.data?.complete ?? false,
			};
		},
		[ruleId, startTime, endTime],
	);

	return { hardcodedAttributeKeys, valueSuggestionsOverride, isLoadingKeys };
}
