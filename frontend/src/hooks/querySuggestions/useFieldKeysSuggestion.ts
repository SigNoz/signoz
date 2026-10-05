import {
	QueryKey,
	useQuery,
	UseQueryOptions,
	UseQueryResult,
} from 'react-query';
import { ErrorType } from 'api/generatedAPIInstance';
import { RenderErrorResponseDTO } from 'api/generated/services/sigNoz.schemas';
import { getFieldKeySuggestions } from 'api/querySuggestions/getFieldKeySuggestions';
import { FIELD_API_CACHE_TIME } from 'constants/queryCacheTime';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { FieldKeysConfig, FieldKeysResponse } from 'api/querySuggestions/types';
import { BuilderQueryType, TelemetryFieldKey } from 'types/api/v5/queryRange';

export type FieldKeysQueryOptions = UseQueryOptions<
	FieldKeysResponse,
	ErrorType<RenderErrorResponseDTO>,
	TelemetryFieldKey[]
> & { queryKey: QueryKey };

export const toFieldKeys = (
	res: FieldKeysResponse | undefined,
): TelemetryFieldKey[] =>
	Object.values(res?.data?.keys ?? {})
		.flat()
		.map((key) => ({ ...key }) as TelemetryFieldKey);

export const getFieldKeysQueryOptions = (
	fieldKeysConfig: FieldKeysConfig,
	builderQueryType?: BuilderQueryType,
): FieldKeysQueryOptions => ({
	queryKey: [
		REACT_QUERY_KEY.FIELD_KEYS_SUGGESTION,
		builderQueryType,
		fieldKeysConfig,
	],
	queryFn: ({ signal }): Promise<FieldKeysResponse> =>
		getFieldKeySuggestions(fieldKeysConfig, builderQueryType, signal),
	select: toFieldKeys,
	staleTime: FIELD_API_CACHE_TIME,
	cacheTime: FIELD_API_CACHE_TIME,
	refetchOnMount: false,
	refetchOnWindowFocus: false,
});

export const useFieldKeysSuggestion = (
	fieldKeysConfig: FieldKeysConfig,
	builderQueryType?: BuilderQueryType,
): UseQueryResult<TelemetryFieldKey[], ErrorType<RenderErrorResponseDTO>> =>
	useQuery(getFieldKeysQueryOptions(fieldKeysConfig, builderQueryType));
