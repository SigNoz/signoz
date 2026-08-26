import {
	getAIObservabilityFieldsKeys,
	getAIObservabilityFieldsValues,
} from 'api/generated/services/ai-observability';
import { TelemetrytypesFieldContextDTO } from 'api/generated/services/sigNoz.schemas';
import { getKeySuggestions } from 'api/querySuggestions/getKeySuggestions';
import { getValueSuggestions } from 'api/querySuggestions/getValueSuggestion';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

export interface SuggestedFieldKey {
	name: string;
	fieldContext?: string;
	fieldDataType?: string;
}

export type SuggestedFieldKeysByName = Record<string, SuggestedFieldKey[]>;

export interface SuggestedFieldKeysPayload {
	complete: boolean;
	keys: SuggestedFieldKeysByName;
}

export interface SuggestedFieldKeysResponse {
	data: { data?: SuggestedFieldKeysPayload };
}

export interface SuggestedFieldValues {
	stringValues: string[];
	numberValues: number[];
	complete: boolean;
}

interface FetchFieldKeysParams {
	builderQueryType: IBuilderQuery['builderQueryType'];
	dataSource: DataSource;
	searchText: string;
	metricName?: string;
	signalSource?: 'meter' | '';
	metricNamespace?: string;
}

interface FetchFieldValuesParams {
	builderQueryType: IBuilderQuery['builderQueryType'];
	dataSource: DataSource;
	key: string;
	searchText: string;
	fieldContext?: SuggestedFieldKey['fieldContext'];
	metricName?: string;
	signalSource?: 'meter' | '';
}

interface LegacyFieldValuesResponseData {
	complete?: boolean;
	values?: {
		stringValues?: string[] | null;
		numberValues?: number[] | null;
	} | null;
}

const EMPTY_FIELD_VALUES: SuggestedFieldValues = {
	stringValues: [],
	numberValues: [],
	complete: false,
};

export const fetchFieldKeysForQuery = async ({
	builderQueryType,
	dataSource,
	searchText,
	metricName,
	signalSource,
	metricNamespace,
}: FetchFieldKeysParams): Promise<SuggestedFieldKeysResponse> => {
	if (builderQueryType === 'builder_ai_query') {
		const response = await getAIObservabilityFieldsKeys({ searchText });

		return {
			data: {
				data: response.data
					? { complete: response.data.complete, keys: response.data.keys ?? {} }
					: undefined,
			},
		};
	}

	return getKeySuggestions({
		signal: dataSource,
		searchText,
		metricName,
		signalSource,
		metricNamespace,
	});
};

export const fetchFieldValuesForQuery = async ({
	builderQueryType,
	dataSource,
	key,
	searchText,
	fieldContext,
	metricName,
	signalSource,
}: FetchFieldValuesParams): Promise<SuggestedFieldValues> => {
	if (builderQueryType === 'builder_ai_query') {
		const response = await getAIObservabilityFieldsValues({
			name: key,
			searchText,
			fieldContext: fieldContext as TelemetrytypesFieldContextDTO | undefined,
		});

		return {
			stringValues: response.data?.values?.stringValues ?? [],
			numberValues: response.data?.values?.numberValues ?? [],
			complete: response.data?.complete ?? false,
		};
	}

	const response = await getValueSuggestions({
		signal: dataSource,
		key,
		searchText,
		signalSource,
		metricName,
	});

	const data = (
		response.data as unknown as {
			data?: LegacyFieldValuesResponseData;
		}
	)?.data;

	if (!data) {
		return EMPTY_FIELD_VALUES;
	}

	return {
		stringValues: data.values?.stringValues ?? [],
		numberValues: data.values?.numberValues ?? [],
		complete: data.complete ?? false,
	};
};
