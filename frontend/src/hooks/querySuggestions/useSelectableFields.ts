import { useQuery } from 'react-query';
import { TelemetrytypesFieldContextDTO } from 'api/generated/services/sigNoz.schemas';
import { fetchFieldKeysForQuery } from 'components/QueryBuilderV2/QueryV2/QuerySearch/fieldSuggestions';
import { TelemetryFieldKey } from 'types/api/v5/queryRange';
import { DataSource } from 'types/common/queryBuilder';

import {
	AI_O11Y_SELECTABLE_FIELDS_QUERY_KEY,
	mergeAIObservabilityStaticFields,
	StaticFieldsSource,
} from 'hooks/querySuggestions/staticFields';

interface UseSelectableFieldsParams {
	signal: DataSource;
	searchText: string;
	source?: StaticFieldsSource;
}

interface UseSelectableFields {
	fields: TelemetryFieldKey[];
	isLoading: boolean;
	/** True once a response has landed; unlike isLoading it is false before the first fetch. */
	isFetched: boolean;
}

const toFieldKeys = (
	keys:
		| Record<
				string,
				{ name: string; fieldContext?: string; fieldDataType?: string }[]
		  >
		| undefined,
): TelemetryFieldKey[] =>
	(keys ? Object.values(keys).flat() : []).map(
		(key): TelemetryFieldKey => ({
			name: key.name,
			fieldContext: key.fieldContext as TelemetryFieldKey['fieldContext'],
			fieldDataType: key.fieldDataType as TelemetryFieldKey['fieldDataType'],
		}),
	);

export function useSelectableFields({
	signal,
	searchText,
	source,
}: UseSelectableFieldsParams): UseSelectableFields {
	const isAIObservability = source === 'ai_o11y';

	const { data, isFetching, isFetched } = useQuery({
		queryKey: isAIObservability
			? AI_O11Y_SELECTABLE_FIELDS_QUERY_KEY
			: ['selectableFields', signal, searchText],
		queryFn: async (): Promise<TelemetryFieldKey[]> => {
			if (isAIObservability) {
				// The per-trace aggregates are computed, so only this endpoint names them.
				const response = await fetchFieldKeysForQuery({
					builderQueryType: 'builder_ai_query',
					dataSource: DataSource.TRACES,
					searchText: '',
					fieldContext: TelemetrytypesFieldContextDTO.trace,
				});

				return mergeAIObservabilityStaticFields(
					toFieldKeys(response.data.data?.keys),
				);
			}

			const response = await fetchFieldKeysForQuery({
				builderQueryType: undefined,
				dataSource: signal,
				searchText,
			});

			return toFieldKeys(response.data.data?.keys);
		},
	});

	return { fields: data ?? [], isLoading: isFetching, isFetched };
}
