import type { QueryKey, UseQueryOptions, UseQueryResult } from 'react-query';
import { useQuery } from 'react-query';
import type { ErrorType } from 'api/generatedAPIInstance';
import type { RenderErrorResponseDTO } from 'api/generated/services/sigNoz.schemas/renderErrorResponseDTO';
import { getFieldKeySuggestions } from 'api/querySuggestions/getFieldKeySuggestions';
import { FIELD_API_CACHE_TIME } from 'constants/queryCacheTime';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import type {
	FieldKeysConfig,
	FieldKeysResponse,
} from 'api/querySuggestions/types';
import type {
	BuilderQueryType,
	TelemetryFieldKey,
} from 'types/api/v5/queryRange';

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

export type FieldKeysQueryOverrides = Partial<
	Omit<FieldKeysQueryOptions, 'queryKey' | 'queryFn' | 'select'>
>;

export const useFieldKeysSuggestion = (
	fieldKeysConfig: FieldKeysConfig,
	builderQueryType?: BuilderQueryType,
	options?: FieldKeysQueryOverrides,
): UseQueryResult<TelemetryFieldKey[], ErrorType<RenderErrorResponseDTO>> =>
	useQuery({
		...getFieldKeysQueryOptions(fieldKeysConfig, builderQueryType),
		...options,
	});
