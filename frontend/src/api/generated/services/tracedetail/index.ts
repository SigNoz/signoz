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
	RenderErrorResponseDTO,
	TracedetailtypesPostableWaterfallDTO,
} from '../sigNoz.schemas';

import { GeneratedAPIInstance } from '../../../generatedAPIInstance';
import type { ErrorType, BodyType } from '../../../generatedAPIInstance';

/**
 * Returns the waterfall view of spans for a given trace ID with tree structure, metadata, and windowed pagination
 * @summary Get waterfall view for a trace
 */
export const getWaterfall = (
	{ traceID }: GetWaterfallPathParameters,
	tracedetailtypesPostableWaterfallDTO: BodyType<TracedetailtypesPostableWaterfallDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetWaterfall200>({
		url: `/api/v3/traces/${traceID}/waterfall`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: tracedetailtypesPostableWaterfallDTO,
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
			data: BodyType<TracedetailtypesPostableWaterfallDTO>;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof getWaterfall>>,
	TError,
	{
		pathParams: GetWaterfallPathParameters;
		data: BodyType<TracedetailtypesPostableWaterfallDTO>;
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
			data: BodyType<TracedetailtypesPostableWaterfallDTO>;
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
	BodyType<TracedetailtypesPostableWaterfallDTO>;
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
			data: BodyType<TracedetailtypesPostableWaterfallDTO>;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof getWaterfall>>,
	TError,
	{
		pathParams: GetWaterfallPathParameters;
		data: BodyType<TracedetailtypesPostableWaterfallDTO>;
	},
	TContext
> => {
	const mutationOptions = getGetWaterfallMutationOptions(options);

	return useMutation(mutationOptions);
};
