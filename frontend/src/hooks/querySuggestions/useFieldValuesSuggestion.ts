import {
	QueryKey,
	useQuery,
	UseQueryOptions,
	UseQueryResult,
} from 'react-query';
import { ErrorType } from 'api/generatedAPIInstance';
import {
	RenderErrorResponseDTO,
	TelemetrytypesTelemetryFieldValuesDTO,
} from 'api/generated/services/sigNoz.schemas';
import { getFieldValueSuggestions } from 'api/querySuggestions/getFieldValueSuggestions';
import { FIELD_API_CACHE_TIME } from 'constants/queryCacheTime';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import {
	FieldValuesConfig,
	FieldValuesResponse,
} from 'api/querySuggestions/types';
import { BuilderQueryType } from 'types/api/v5/queryRange';

export type FieldValuesQueryOptions = UseQueryOptions<
	FieldValuesResponse,
	ErrorType<RenderErrorResponseDTO>,
	TelemetrytypesTelemetryFieldValuesDTO
> & { queryKey: QueryKey };

const EMPTY_FIELD_VALUES: TelemetrytypesTelemetryFieldValuesDTO = {};

export const toFieldValues = (
	res: FieldValuesResponse | undefined,
): TelemetrytypesTelemetryFieldValuesDTO =>
	res?.data?.values ?? EMPTY_FIELD_VALUES;

export const getFieldValuesQueryOptions = (
	fieldValuesConfig: FieldValuesConfig,
	builderQueryType?: BuilderQueryType,
): FieldValuesQueryOptions => ({
	queryKey: [
		REACT_QUERY_KEY.FIELD_VALUES_SUGGESTION,
		builderQueryType,
		fieldValuesConfig,
	],
	queryFn: ({ signal }): Promise<FieldValuesResponse> =>
		getFieldValueSuggestions(fieldValuesConfig, builderQueryType, signal),
	select: toFieldValues,
	cacheTime: FIELD_API_CACHE_TIME,
	keepPreviousData: true,
});

export const useFieldValuesSuggestion = (
	fieldValuesConfig: FieldValuesConfig,
	builderQueryType?: BuilderQueryType,
	options?: Pick<FieldValuesQueryOptions, 'enabled'>,
): UseQueryResult<
	TelemetrytypesTelemetryFieldValuesDTO,
	ErrorType<RenderErrorResponseDTO>
> =>
	useQuery({
		...getFieldValuesQueryOptions(fieldValuesConfig, builderQueryType),
		...options,
	});
