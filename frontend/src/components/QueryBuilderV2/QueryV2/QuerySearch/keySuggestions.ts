import { getAIObservabilityFieldsKeys } from 'api/generated/services/ai-observability';
import { getKeySuggestions } from 'api/querySuggestions/getKeySuggestions';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

/** The only fields both key endpoints agree on; ai_observability reports a wider fieldContext (adds trace). */
export interface SuggestedFieldKey {
	name: string;
	fieldContext?: string;
	fieldDataType?: string;
}

export type SuggestedFieldKeysByName = Record<string, SuggestedFieldKey[]>;

interface FetchFieldKeysParams {
	builderQueryType: IBuilderQuery['builderQueryType'];
	dataSource: DataSource;
	searchText: string;
	metricName?: string;
	signalSource?: 'meter' | '';
	metricNamespace?: string;
}

/** builder_ai_query needs the ai_observability endpoint: its per-trace aggregates are computed, never ingested. */
export const fetchFieldKeysForQuery = async ({
	builderQueryType,
	dataSource,
	searchText,
	metricName,
	signalSource,
	metricNamespace,
}: FetchFieldKeysParams): Promise<SuggestedFieldKeysByName | undefined> => {
	if (builderQueryType === 'builder_ai_query') {
		const response = await getAIObservabilityFieldsKeys({ searchText });

		return response.data?.keys ?? undefined;
	}

	const response = await getKeySuggestions({
		signal: dataSource,
		searchText,
		metricName,
		signalSource,
		metricNamespace,
	});

	return response.data.data?.keys;
};
