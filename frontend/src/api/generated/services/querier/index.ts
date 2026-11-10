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
	QueryRangePreviewV5200,
	QueryRangePreviewV5Params,
	QueryRangeV5200,
	Querybuildertypesv5QueryRangeRequestDTO,
	RenderErrorResponseDTO,
	ReplaceVariables200,
} from '../sigNoz.schemas';

import { GeneratedAPIInstance } from '../../../generatedAPIInstance';
import type { ErrorType, BodyType } from '../../../generatedAPIInstance';

/**
 * Execute a composite query over a time range. Supports builder queries (traces, logs, metrics), formulas, trace operators, PromQL, and ClickHouse SQL.
 * @summary Query range
 */
export const queryRangeV5 = (
	querybuildertypesv5QueryRangeRequestDTO?: BodyType<Querybuildertypesv5QueryRangeRequestDTO>,
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
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof queryRangeV5>>,
		TError,
		{ data?: BodyType<Querybuildertypesv5QueryRangeRequestDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof queryRangeV5>>,
	TError,
	{ data?: BodyType<Querybuildertypesv5QueryRangeRequestDTO> },
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
		{ data?: BodyType<Querybuildertypesv5QueryRangeRequestDTO> }
	> = (props) => {
		const { data } = props ?? {};

		return queryRangeV5(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type QueryRangeV5MutationResult = NonNullable<
	Awaited<ReturnType<typeof queryRangeV5>>
>;
export type QueryRangeV5MutationBody =
	| BodyType<Querybuildertypesv5QueryRangeRequestDTO>
	| undefined;
export type QueryRangeV5MutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Query range
 */
export const useQueryRangeV5 = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof queryRangeV5>>,
		TError,
		{ data?: BodyType<Querybuildertypesv5QueryRangeRequestDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof queryRangeV5>>,
	TError,
	{ data?: BodyType<Querybuildertypesv5QueryRangeRequestDTO> },
	TContext
> => {
	return useMutation(getQueryRangeV5MutationOptions(options));
};
/**
 * Validate a composite query without executing it. Accepts the same payload as the query range endpoint. By default (verbose=true) returns, for each query, the rendered underlying ClickHouse statement(s) with each statement's EXPLAIN ESTIMATE (per-table parts/rows/marks) and granule index analysis (candidate/surviving granules and the per-index pruning funnel). Pass ?verbose=false for the lightweight per-query verdict (valid/error/warnings) with no rendered SQL and no ClickHouse round trips. Intended for agentic/dry-run consumption: per-query errors are reported in the response rather than failing the whole request.
 * @summary Query range preview
 */
export const queryRangePreviewV5 = (
	querybuildertypesv5QueryRangeRequestDTO?: BodyType<Querybuildertypesv5QueryRangeRequestDTO>,
	params?: QueryRangePreviewV5Params,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<QueryRangePreviewV5200>({
		url: `/api/v5/query_range/preview`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: querybuildertypesv5QueryRangeRequestDTO,
		params,
		signal,
	});
};

export const getQueryRangePreviewV5MutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof queryRangePreviewV5>>,
		TError,
		{
			data?: BodyType<Querybuildertypesv5QueryRangeRequestDTO>;
			params?: QueryRangePreviewV5Params;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof queryRangePreviewV5>>,
	TError,
	{
		data?: BodyType<Querybuildertypesv5QueryRangeRequestDTO>;
		params?: QueryRangePreviewV5Params;
	},
	TContext
> => {
	const mutationKey = ['queryRangePreviewV5'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof queryRangePreviewV5>>,
		{
			data?: BodyType<Querybuildertypesv5QueryRangeRequestDTO>;
			params?: QueryRangePreviewV5Params;
		}
	> = (props) => {
		const { data, params } = props ?? {};

		return queryRangePreviewV5(data, params);
	};

	return { mutationFn, ...mutationOptions };
};

export type QueryRangePreviewV5MutationResult = NonNullable<
	Awaited<ReturnType<typeof queryRangePreviewV5>>
>;
export type QueryRangePreviewV5MutationBody =
	| BodyType<Querybuildertypesv5QueryRangeRequestDTO>
	| undefined;
export type QueryRangePreviewV5MutationError =
	ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Query range preview
 */
export const useQueryRangePreviewV5 = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof queryRangePreviewV5>>,
		TError,
		{
			data?: BodyType<Querybuildertypesv5QueryRangeRequestDTO>;
			params?: QueryRangePreviewV5Params;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof queryRangePreviewV5>>,
	TError,
	{
		data?: BodyType<Querybuildertypesv5QueryRangeRequestDTO>;
		params?: QueryRangePreviewV5Params;
	},
	TContext
> => {
	return useMutation(getQueryRangePreviewV5MutationOptions(options));
};
/**
 * Replace variables in a query
 * @summary Replace variables
 */
export const replaceVariables = (
	querybuildertypesv5QueryRangeRequestDTO?: BodyType<Querybuildertypesv5QueryRangeRequestDTO>,
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
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof replaceVariables>>,
		TError,
		{ data?: BodyType<Querybuildertypesv5QueryRangeRequestDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof replaceVariables>>,
	TError,
	{ data?: BodyType<Querybuildertypesv5QueryRangeRequestDTO> },
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
		{ data?: BodyType<Querybuildertypesv5QueryRangeRequestDTO> }
	> = (props) => {
		const { data } = props ?? {};

		return replaceVariables(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type ReplaceVariablesMutationResult = NonNullable<
	Awaited<ReturnType<typeof replaceVariables>>
>;
export type ReplaceVariablesMutationBody =
	| BodyType<Querybuildertypesv5QueryRangeRequestDTO>
	| undefined;
export type ReplaceVariablesMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Replace variables
 */
export const useReplaceVariables = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof replaceVariables>>,
		TError,
		{ data?: BodyType<Querybuildertypesv5QueryRangeRequestDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof replaceVariables>>,
	TError,
	{ data?: BodyType<Querybuildertypesv5QueryRangeRequestDTO> },
	TContext
> => {
	return useMutation(getReplaceVariablesMutationOptions(options));
};
