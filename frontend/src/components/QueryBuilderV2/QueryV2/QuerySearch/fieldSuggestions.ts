import {
	getAIObservabilityFieldsKeys,
	getAIObservabilityFieldsValues,
} from 'api/generated/services/ai-observability';
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

export interface SuggestedFieldValuesPayload {
	complete?: boolean;
	values?: {
		stringValues?: string[] | null;
		numberValues?: number[] | null;
	} | null;
}

export interface SuggestedFieldValuesResponse {
	data: { data?: SuggestedFieldValuesPayload };
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
	metricName?: string;
	signalSource?: 'meter' | '';
}

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
	metricName,
	signalSource,
}: FetchFieldValuesParams): Promise<SuggestedFieldValuesResponse> => {
	if (builderQueryType === 'builder_ai_query') {
		const response = await getAIObservabilityFieldsValues({
			name: key,
			searchText,
		});

		return { data: { data: response.data } };
	}

	// getValueSuggestions' declared response type does not match what the endpoint returns.
	return getValueSuggestions({
		signal: dataSource,
		key,
		searchText,
		signalSource,
		metricName,
	}) as unknown as Promise<SuggestedFieldValuesResponse>;
};
