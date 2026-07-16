import { useCallback, useMemo } from 'react';
import {
	getRuleHistoryFilterValues,
	useGetRuleHistoryFilterKeys,
} from 'api/generated/services/rules';
import {
	TelemetrytypesFieldDataTypeDTO,
	TelemetrytypesFieldContextDTO,
} from 'api/generated/services/sigNoz.schemas';
import { QUERY_BUILDER_KEY_TYPES } from 'constants/antlrQueryConstants';
import { useAlertHistoryQueryParams } from 'pages/AlertDetails/hooks';
import { QueryKeyDataSuggestionsProps } from 'types/api/querySuggestions/types';

function dataTypeToKeyType(
	dt: TelemetrytypesFieldDataTypeDTO | undefined,
): QUERY_BUILDER_KEY_TYPES {
	if (
		dt === TelemetrytypesFieldDataTypeDTO.float64 ||
		dt === TelemetrytypesFieldDataTypeDTO.int64 ||
		dt === TelemetrytypesFieldDataTypeDTO.number
	) {
		return QUERY_BUILDER_KEY_TYPES.NUMBER;
	}
	if (dt === TelemetrytypesFieldDataTypeDTO.bool) {
		return QUERY_BUILDER_KEY_TYPES.BOOLEAN;
	}
	return QUERY_BUILDER_KEY_TYPES.STRING;
}

function fieldContextToSuggestionContext(
	fc: TelemetrytypesFieldContextDTO | undefined,
): QueryKeyDataSuggestionsProps['fieldContext'] {
	if (fc === TelemetrytypesFieldContextDTO.resource) {
		return 'resource';
	}
	if (fc === TelemetrytypesFieldContextDTO.span) {
		return 'span';
	}
	if (fc === TelemetrytypesFieldContextDTO.attribute) {
		return 'attribute';
	}
	return undefined;
}

function dataTypeToSuggestionType(
	dt: TelemetrytypesFieldDataTypeDTO | undefined,
): string {
	if (dt === TelemetrytypesFieldDataTypeDTO.string) {
		return 'keyword';
	}
	if (
		dt === TelemetrytypesFieldDataTypeDTO.float64 ||
		dt === TelemetrytypesFieldDataTypeDTO.int64 ||
		dt === TelemetrytypesFieldDataTypeDTO.number
	) {
		return 'number';
	}
	if (dt === TelemetrytypesFieldDataTypeDTO.bool) {
		return 'bool';
	}
	return 'keyword';
}

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
					enabled: !!ruleId && startTime !== null && endTime !== null,
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
