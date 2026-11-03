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
	AnnotationtypesPostableAnnotationsDTO,
	ListAnnotations200,
	RenderErrorResponseDTO,
} from '../sigNoz.schemas';

import { GeneratedAPIInstance } from '../../../generatedAPIInstance';
import type { ErrorType, BodyType } from '../../../generatedAPIInstance';

/**
 * Returns annotation markers of the requested kind inside the time range. For kind 'deployment', a marker is the first time a (service, environment, version) tuple was seen in the requested signals (traces, logs, or both when omitted). Each record carries the signal that produced it, the first seen time in epoch milliseconds, the trace and span ids or the log id of the first row, and the resource attributes of that row minus the identity keys. Supports an optional resource-attribute filter expression. historyAvailableFrom is the earliest time the result can be trusted, bounded by the signal retention.
 * @summary List annotations
 */
export const listAnnotations = (
	annotationtypesPostableAnnotationsDTO?: BodyType<AnnotationtypesPostableAnnotationsDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<ListAnnotations200>({
		url: `/api/v1/annotations`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: annotationtypesPostableAnnotationsDTO,
		signal,
	});
};

export const getListAnnotationsMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof listAnnotations>>,
		TError,
		{ data?: BodyType<AnnotationtypesPostableAnnotationsDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof listAnnotations>>,
	TError,
	{ data?: BodyType<AnnotationtypesPostableAnnotationsDTO> },
	TContext
> => {
	const mutationKey = ['listAnnotations'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof listAnnotations>>,
		{ data?: BodyType<AnnotationtypesPostableAnnotationsDTO> }
	> = (props) => {
		const { data } = props ?? {};

		return listAnnotations(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type ListAnnotationsMutationResult = NonNullable<
	Awaited<ReturnType<typeof listAnnotations>>
>;
export type ListAnnotationsMutationBody =
	| BodyType<AnnotationtypesPostableAnnotationsDTO>
	| undefined;
export type ListAnnotationsMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary List annotations
 */
export const useListAnnotations = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof listAnnotations>>,
		TError,
		{ data?: BodyType<AnnotationtypesPostableAnnotationsDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof listAnnotations>>,
	TError,
	{ data?: BodyType<AnnotationtypesPostableAnnotationsDTO> },
	TContext
> => {
	return useMutation(getListAnnotationsMutationOptions(options));
};
