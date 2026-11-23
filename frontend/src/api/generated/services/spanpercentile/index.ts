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
	GetSpanPercentile200,
	RenderErrorResponseDTO,
	SpanpercentiletypesSpanPercentileRequestDTO,
} from '../sigNoz.schemas';

import { GeneratedAPIInstance } from '../../../generatedAPIInstance';
import type { ErrorType, BodyType } from '../../../generatedAPIInstance';

/**
 * Places a span's duration among the spans of the same name and service, and the same resource attributes when given, that started in the time range.
 * @summary Get percentile of a span duration
 */
export const getSpanPercentile = (
	spanpercentiletypesSpanPercentileRequestDTO?: BodyType<SpanpercentiletypesSpanPercentileRequestDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetSpanPercentile200>({
		url: `/api/v1/span_percentile`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: spanpercentiletypesSpanPercentileRequestDTO,
		signal,
	});
};

export const getGetSpanPercentileMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof getSpanPercentile>>,
		TError,
		{ data?: BodyType<SpanpercentiletypesSpanPercentileRequestDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof getSpanPercentile>>,
	TError,
	{ data?: BodyType<SpanpercentiletypesSpanPercentileRequestDTO> },
	TContext
> => {
	const mutationKey = ['getSpanPercentile'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof getSpanPercentile>>,
		{ data?: BodyType<SpanpercentiletypesSpanPercentileRequestDTO> }
	> = (props) => {
		const { data } = props ?? {};

		return getSpanPercentile(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type GetSpanPercentileMutationResult = NonNullable<
	Awaited<ReturnType<typeof getSpanPercentile>>
>;
export type GetSpanPercentileMutationBody =
	| BodyType<SpanpercentiletypesSpanPercentileRequestDTO>
	| undefined;
export type GetSpanPercentileMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get percentile of a span duration
 */
export const useGetSpanPercentile = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof getSpanPercentile>>,
		TError,
		{ data?: BodyType<SpanpercentiletypesSpanPercentileRequestDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof getSpanPercentile>>,
	TError,
	{ data?: BodyType<SpanpercentiletypesSpanPercentileRequestDTO> },
	TContext
> => {
	return useMutation(getGetSpanPercentileMutationOptions(options));
};
