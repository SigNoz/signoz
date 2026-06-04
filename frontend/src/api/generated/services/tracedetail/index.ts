/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import { useMutation } from 'react-query';
import type {
	MutationFunction,
	UseMutationOptions,
	UseMutationResult,
} from 'react-query';

import type {
	GetTraceAggregations200,
	GetTraceAggregationsPathParameters,
	GetWaterfall200,
	GetWaterfallPathParameters,
	GetWaterfallV4200,
	GetWaterfallV4PathParameters,
	RenderErrorResponseDTO,
	SpantypesPostableTraceAggregationsDTO,
	SpantypesPostableWaterfallDTO,
} from '../sigNoz.schemas';

import { GeneratedAPIInstance } from '../../../generatedAPIInstance';
import type { ErrorType, BodyType } from '../../../generatedAPIInstance';

/**
 * Computes span aggregations grouped by requested field.
 * @summary Get aggregations for a trace
 */
export const getTraceAggregations = (
	{ traceID }: GetTraceAggregationsPathParameters,
	spantypesPostableTraceAggregationsDTO?: BodyType<SpantypesPostableTraceAggregationsDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetTraceAggregations200>({
		url: `/api/v1/traces/${traceID}/aggregations`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: spantypesPostableTraceAggregationsDTO,
		signal,
	});
};

export const getGetTraceAggregationsMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof getTraceAggregations>>,
		TError,
		{
			pathParams: GetTraceAggregationsPathParameters;
			data?: BodyType<SpantypesPostableTraceAggregationsDTO>;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof getTraceAggregations>>,
	TError,
	{
		pathParams: GetTraceAggregationsPathParameters;
		data?: BodyType<SpantypesPostableTraceAggregationsDTO>;
	},
	TContext
> => {
	const mutationKey = ['getTraceAggregations'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof getTraceAggregations>>,
		{
			pathParams: GetTraceAggregationsPathParameters;
			data?: BodyType<SpantypesPostableTraceAggregationsDTO>;
		}
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return getTraceAggregations(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type GetTraceAggregationsMutationResult = NonNullable<
	Awaited<ReturnType<typeof getTraceAggregations>>
>;
export type GetTraceAggregationsMutationBody =
	| BodyType<SpantypesPostableTraceAggregationsDTO>
	| undefined;
export type GetTraceAggregationsMutationError =
	ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get aggregations for a trace
 */
export const useGetTraceAggregations = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof getTraceAggregations>>,
		TError,
		{
			pathParams: GetTraceAggregationsPathParameters;
			data?: BodyType<SpantypesPostableTraceAggregationsDTO>;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof getTraceAggregations>>,
	TError,
	{
		pathParams: GetTraceAggregationsPathParameters;
		data?: BodyType<SpantypesPostableTraceAggregationsDTO>;
	},
	TContext
> => {
	return useMutation(getGetTraceAggregationsMutationOptions(options));
};
/**
 * Returns the waterfall view of spans for a given trace ID with tree structure, metadata, and windowed pagination
 * @summary Get waterfall view for a trace
 */
export const getWaterfall = (
	{ traceID }: GetWaterfallPathParameters,
	spantypesPostableWaterfallDTO?: BodyType<SpantypesPostableWaterfallDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetWaterfall200>({
		url: `/api/v3/traces/${traceID}/waterfall`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: spantypesPostableWaterfallDTO,
		signal,
	});
};

export const getGetWaterfallMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof getWaterfall>>,
		TError,
		{
			pathParams: GetWaterfallPathParameters;
			data?: BodyType<SpantypesPostableWaterfallDTO>;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof getWaterfall>>,
	TError,
	{
		pathParams: GetWaterfallPathParameters;
		data?: BodyType<SpantypesPostableWaterfallDTO>;
	},
	TContext
> => {
	const mutationKey = ['getWaterfall'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof getWaterfall>>,
		{
			pathParams: GetWaterfallPathParameters;
			data?: BodyType<SpantypesPostableWaterfallDTO>;
		}
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return getWaterfall(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type GetWaterfallMutationResult = NonNullable<
	Awaited<ReturnType<typeof getWaterfall>>
>;
export type GetWaterfallMutationBody =
	| BodyType<SpantypesPostableWaterfallDTO>
	| undefined;
export type GetWaterfallMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get waterfall view for a trace
 */
export const useGetWaterfall = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof getWaterfall>>,
		TError,
		{
			pathParams: GetWaterfallPathParameters;
			data?: BodyType<SpantypesPostableWaterfallDTO>;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof getWaterfall>>,
	TError,
	{
		pathParams: GetWaterfallPathParameters;
		data?: BodyType<SpantypesPostableWaterfallDTO>;
	},
	TContext
> => {
	return useMutation(getGetWaterfallMutationOptions(options));
};
/**
 * Returns the waterfall view of spans including all spans if total spans are under a limit, a max count otherwise. Aggregations are dropped compared to v3
 * @summary Get waterfall view for a trace
 */
export const getWaterfallV4 = (
	{ traceID }: GetWaterfallV4PathParameters,
	spantypesPostableWaterfallDTO?: BodyType<SpantypesPostableWaterfallDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetWaterfallV4200>({
		url: `/api/v4/traces/${traceID}/waterfall`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: spantypesPostableWaterfallDTO,
		signal,
	});
};

export const getGetWaterfallV4MutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof getWaterfallV4>>,
		TError,
		{
			pathParams: GetWaterfallV4PathParameters;
			data?: BodyType<SpantypesPostableWaterfallDTO>;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof getWaterfallV4>>,
	TError,
	{
		pathParams: GetWaterfallV4PathParameters;
		data?: BodyType<SpantypesPostableWaterfallDTO>;
	},
	TContext
> => {
	const mutationKey = ['getWaterfallV4'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof getWaterfallV4>>,
		{
			pathParams: GetWaterfallV4PathParameters;
			data?: BodyType<SpantypesPostableWaterfallDTO>;
		}
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return getWaterfallV4(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type GetWaterfallV4MutationResult = NonNullable<
	Awaited<ReturnType<typeof getWaterfallV4>>
>;
export type GetWaterfallV4MutationBody =
	| BodyType<SpantypesPostableWaterfallDTO>
	| undefined;
export type GetWaterfallV4MutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get waterfall view for a trace
 */
export const useGetWaterfallV4 = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof getWaterfallV4>>,
		TError,
		{
			pathParams: GetWaterfallV4PathParameters;
			data?: BodyType<SpantypesPostableWaterfallDTO>;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof getWaterfallV4>>,
	TError,
	{
		pathParams: GetWaterfallV4PathParameters;
		data?: BodyType<SpantypesPostableWaterfallDTO>;
	},
	TContext
> => {
	return useMutation(getGetWaterfallV4MutationOptions(options));
};
