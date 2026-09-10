import {
	QueryClient,
	QueryKey,
	useQuery,
	UseQueryOptions,
	UseQueryResult,
} from 'react-query';
import { getGetAIObservabilityFieldsKeysQueryOptions } from 'api/generated/services/ai-observability';
import { getGetFieldsKeysQueryOptions } from 'api/generated/services/fields';
import { ErrorType } from 'api/generatedAPIInstance';
import {
	GetFieldsKeys200,
	RenderErrorResponseDTO,
	TelemetrytypesFieldContextDTO,
	TelemetrytypesSignalDTO,
	TelemetrytypesSourceDTO,
} from 'api/generated/services/sigNoz.schemas';
import { BuilderQueryType, TelemetryFieldKey } from 'types/api/v5/queryRange';
import { DataSource } from 'types/common/queryBuilder';

export interface FieldKeysConfig {
	builderQueryType?: BuilderQueryType;
	fieldContext?: TelemetrytypesFieldContextDTO;
	/** Never fetched; merged client-side in `select` so observers share one cache entry. */
	staticFields?: TelemetryFieldKey[];
	metricName?: string;
	metricNamespace?: string;
	signalSource?: TelemetrytypesSourceDTO | '';
}

type FieldKeysResponse = GetFieldsKeys200;

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

export const mergeStatics = (
	statics: TelemetryFieldKey[] = [],
	fetched: TelemetryFieldKey[],
	searchText: string,
): TelemetryFieldKey[] => {
	const search = searchText.trim().toLowerCase();
	const staticNames = new Set(statics.map((field) => field.name));

	return [
		...statics.filter((field) => field.name.toLowerCase().includes(search)),
		...fetched.filter((field) => !staticNames.has(field.name)),
	];
};

export const getFieldKeysQueryOptions = (
	{
		builderQueryType,
		fieldContext,
		staticFields,
		metricName,
		metricNamespace,
		signalSource,
	}: FieldKeysConfig,
	dataSource: DataSource,
	searchText: string,
): FieldKeysQueryOptions => {
	const select = (res: FieldKeysResponse): TelemetryFieldKey[] =>
		mergeStatics(staticFields, toFieldKeys(res), searchText);

	if (builderQueryType === 'builder_ai_query') {
		return getGetAIObservabilityFieldsKeysQueryOptions<TelemetryFieldKey[]>(
			{ searchText, fieldContext },
			{ query: { select } },
		) as FieldKeysQueryOptions;
	}

	return getGetFieldsKeysQueryOptions<TelemetryFieldKey[]>(
		{
			signal: dataSource as unknown as TelemetrytypesSignalDTO,
			searchText,
			fieldContext,
			metricName,
			metricNamespace,
			source: signalSource as TelemetrytypesSourceDTO | undefined,
		},
		{ query: { select } },
	) as FieldKeysQueryOptions;
};

export const useFieldKeys = (
	config: FieldKeysConfig,
	dataSource: DataSource,
	searchText: string,
): UseQueryResult<TelemetryFieldKey[], ErrorType<RenderErrorResponseDTO>> =>
	useQuery(getFieldKeysQueryOptions(config, dataSource, searchText));

export const fetchFieldKeys = async (
	queryClient: QueryClient,
	config: FieldKeysConfig,
	dataSource: DataSource,
	searchText: string,
): Promise<TelemetryFieldKey[]> => {
	const { select, ...fetchOptions } = getFieldKeysQueryOptions(
		config,
		dataSource,
		searchText,
	);
	const response = (await queryClient.fetchQuery(
		fetchOptions,
	)) as FieldKeysResponse;

	return select?.(response) ?? toFieldKeys(response);
};
