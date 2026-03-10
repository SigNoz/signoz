/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'yarn generate:api'
 * SigNoz
 */
import type {
	MutationFunction,
	UseMutationOptions,
	UseMutationResult,
} from 'react-query';
import { useMutation } from 'react-query';

import type { BodyType, ErrorType } from '../../../generatedAPIInstance';
import { GeneratedAPIInstance } from '../../../generatedAPIInstance';
import type {
	Querybuildertypesv5QueryRangeRequestDTO,
	QueryRangeV5200,
	RenderErrorResponseDTO,
	ReplaceVariables200,
} from '../sigNoz.schemas';

/**
 * Execute a composite query over a time range. Supports builder queries (traces, logs, metrics), formulas, trace operators, PromQL, and ClickHouse SQL.
 * @summary Query range
 */
export const queryRangeV5 = (
	querybuildertypesv5QueryRangeRequestDTO: BodyType<Querybuildertypesv5QueryRangeRequestDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<QueryRangeV5200>({
		url: `/api/v5/query_range`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: querybuildertypesv5QueryRangeRequestDTO,
		signal,
	});
};

export const getQueryRangeV5MutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof queryRangeV5>>,
		TError,
		{ data: BodyType<Querybuildertypesv5QueryRangeRequestDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof queryRangeV5>>,
	TError,
	{ data: BodyType<Querybuildertypesv5QueryRangeRequestDTO> },
	TContext
> => {
	const mutationKey = ['queryRangeV5'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
		  'mutationKey' in options.mutation &&
		  options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof queryRangeV5>>,
		{ data: BodyType<Querybuildertypesv5QueryRangeRequestDTO> }
	> = (props) => {
		const { data } = props ?? {};

		return queryRangeV5(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type QueryRangeV5MutationResult = NonNullable<
	Awaited<ReturnType<typeof queryRangeV5>>
>;
export type QueryRangeV5MutationBody = BodyType<Querybuildertypesv5QueryRangeRequestDTO>;
export type QueryRangeV5MutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Query range
 */
export const useQueryRangeV5 = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof queryRangeV5>>,
		TError,
		{ data: BodyType<Querybuildertypesv5QueryRangeRequestDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof queryRangeV5>>,
	TError,
	{ data: BodyType<Querybuildertypesv5QueryRangeRequestDTO> },
	TContext
> => {
	const mutationOptions = getQueryRangeV5MutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * Replace variables in a query
 * @summary Replace variables
 */
export const replaceVariables = (
	querybuildertypesv5QueryRangeRequestDTO: BodyType<Querybuildertypesv5QueryRangeRequestDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<ReplaceVariables200>({
		url: `/api/v5/substitute_vars`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: querybuildertypesv5QueryRangeRequestDTO,
		signal,
	});
};

export const getReplaceVariablesMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof replaceVariables>>,
		TError,
		{ data: BodyType<Querybuildertypesv5QueryRangeRequestDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof replaceVariables>>,
	TError,
	{ data: BodyType<Querybuildertypesv5QueryRangeRequestDTO> },
	TContext
> => {
	const mutationKey = ['replaceVariables'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
		  'mutationKey' in options.mutation &&
		  options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof replaceVariables>>,
		{ data: BodyType<Querybuildertypesv5QueryRangeRequestDTO> }
	> = (props) => {
		const { data } = props ?? {};

		return replaceVariables(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type ReplaceVariablesMutationResult = NonNullable<
	Awaited<ReturnType<typeof replaceVariables>>
>;
export type ReplaceVariablesMutationBody = BodyType<Querybuildertypesv5QueryRangeRequestDTO>;
export type ReplaceVariablesMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Replace variables
 */
export const useReplaceVariables = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof replaceVariables>>,
		TError,
		{ data: BodyType<Querybuildertypesv5QueryRangeRequestDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof replaceVariables>>,
	TError,
	{ data: BodyType<Querybuildertypesv5QueryRangeRequestDTO> },
	TContext
> => {
	const mutationOptions = getReplaceVariablesMutationOptions(options);

	return useMutation(mutationOptions);
};
