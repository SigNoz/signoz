import { getAIObservabilityFieldsValues } from 'api/generated/services/ai-observability';
import { getValueSuggestions } from 'api/querySuggestions/getValueSuggestion';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

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

interface FetchFieldValuesParams {
	builderQueryType: IBuilderQuery['builderQueryType'];
	dataSource: DataSource;
	key: string;
	searchText: string;
	metricName?: string;
	signalSource?: 'meter' | '';
}

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
