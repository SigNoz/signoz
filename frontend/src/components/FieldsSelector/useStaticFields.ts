import { useMemo } from 'react';
import { useQuery } from 'react-query';
import { TelemetrytypesFieldContextDTO } from 'api/generated/services/sigNoz.schemas';
import { fetchFieldKeysForQuery } from 'components/QueryBuilderV2/QueryV2/QuerySearch/fieldSuggestions';
import { TelemetryFieldKey } from 'types/api/v5/queryRange';
import { DataSource } from 'types/common/queryBuilder';

import {
	AI_O11Y_AGGREGATE_KEYS_QUERY_KEY,
	StaticFieldsSource,
	mergeAIObservabilityStaticFields,
} from './staticFields';

interface UseHardCodedFields {
	/** undefined means the caller named no source, so the endpoint stays in charge. */
	fields: TelemetryFieldKey[] | undefined;
	isLoading: boolean;
}

export function useStaticFields(
	source?: StaticFieldsSource,
): UseHardCodedFields {
	// The per-trace aggregates are computed, so only this endpoint names them.
	const { data, isFetched } = useQuery({
		queryKey: AI_O11Y_AGGREGATE_KEYS_QUERY_KEY,
		queryFn: async () => {
			const response = await fetchFieldKeysForQuery({
				builderQueryType: 'builder_ai_query',
				dataSource: DataSource.TRACES,
				searchText: '',
				fieldContext: TelemetrytypesFieldContextDTO.trace,
			});

			return response.data.data?.keys;
		},
		enabled: source === 'ai_o11y',
	});

	const fields = useMemo(() => {
		if (source !== 'ai_o11y') {
			return undefined;
		}

		const aggregates = (data ? Object.values(data).flat() : []).map(
			(key): TelemetryFieldKey => ({
				name: key.name,
				fieldContext: key.fieldContext as TelemetryFieldKey['fieldContext'],
				fieldDataType: key.fieldDataType as TelemetryFieldKey['fieldDataType'],
			}),
		);

		return mergeAIObservabilityStaticFields(aggregates);
	}, [source, data]);

	return { fields, isLoading: source !== undefined && !isFetched };
}
