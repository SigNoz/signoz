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
	GetWaterfall200,
	GetWaterfallPathParameters,
	GetWaterfallV4200,
	GetWaterfallV4PathParameters,
	RenderErrorResponseDTO,
	SpantypesPostableWaterfallDTO,
} from '../sigNoz.schemas';

import { GeneratedAPIInstance } from '../../../generatedAPIInstance';
import type { ErrorType, BodyType } from '../../../generatedAPIInstance';

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
 * Two-step fetch: minimal fields for all spans to build the tree, full fields only for the visible window. Aggregations are not included in the response.
 * @summary Get waterfall view for a trace (OOM-safe)
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
 * @summary Get waterfall view for a trace (OOM-safe)
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
