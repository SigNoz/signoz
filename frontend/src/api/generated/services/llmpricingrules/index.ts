/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'yarn generate:api'
 * SigNoz
 */
import { useMutation, useQuery } from 'react-query';
import type {
	InvalidateOptions,
	MutationFunction,
	QueryClient,
	QueryFunction,
	QueryKey,
	UseMutationOptions,
	UseMutationResult,
	UseQueryOptions,
	UseQueryResult,
} from 'react-query';

import type {
	DeleteLLMPricingRulePathParameters,
	GetLLMPricingRule200,
	GetLLMPricingRulePathParameters,
	ListLLMPricingRules200,
	ListLLMPricingRulesParams,
	LlmpricingruletypesUpdatableLLMPricingRulesDTO,
	RenderErrorResponseDTO,
} from '../sigNoz.schemas';

import { GeneratedAPIInstance } from '../../../generatedAPIInstance';
import type { ErrorType, BodyType } from '../../../generatedAPIInstance';

/**
 * Returns all LLM pricing rules for the authenticated org, with pagination.
 * @summary List pricing rules
 */
export const listLLMPricingRules = (
	params?: ListLLMPricingRulesParams,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<ListLLMPricingRules200>({
		url: `/api/v1/llm_pricing_rules`,
		method: 'GET',
		params,
		signal,
	});
};

export const getListLLMPricingRulesQueryKey = (
	params?: ListLLMPricingRulesParams,
) => {
	return [`/api/v1/llm_pricing_rules`, ...(params ? [params] : [])] as const;
};

export const getListLLMPricingRulesQueryOptions = <
	TData = Awaited<ReturnType<typeof listLLMPricingRules>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	params?: ListLLMPricingRulesParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof listLLMPricingRules>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ?? getListLLMPricingRulesQueryKey(params);

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof listLLMPricingRules>>
	> = ({ signal }) => listLLMPricingRules(params, signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof listLLMPricingRules>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type ListLLMPricingRulesQueryResult = NonNullable<
	Awaited<ReturnType<typeof listLLMPricingRules>>
>;
export type ListLLMPricingRulesQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary List pricing rules
 */

export function useListLLMPricingRules<
	TData = Awaited<ReturnType<typeof listLLMPricingRules>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	params?: ListLLMPricingRulesParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof listLLMPricingRules>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getListLLMPricingRulesQueryOptions(params, options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary List pricing rules
 */
export const invalidateListLLMPricingRules = async (
	queryClient: QueryClient,
	params?: ListLLMPricingRulesParams,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getListLLMPricingRulesQueryKey(params) },
		options,
	);

	return queryClient;
};

/**
 * Single write endpoint used by both the user and the Zeus sync job. Per-rule match is by id, then sourceId, then insert. Override rows (is_override=true) are fully preserved when the request does not provide isOverride; only synced_at is stamped.
 * @summary Create or update pricing rules
 */
export const createOrUpdateLLMPricingRules = (
	llmpricingruletypesUpdatableLLMPricingRulesDTO: BodyType<LlmpricingruletypesUpdatableLLMPricingRulesDTO>,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v1/llm_pricing_rules`,
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		data: llmpricingruletypesUpdatableLLMPricingRulesDTO,
	});
};

export const getCreateOrUpdateLLMPricingRulesMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createOrUpdateLLMPricingRules>>,
		TError,
		{ data: BodyType<LlmpricingruletypesUpdatableLLMPricingRulesDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createOrUpdateLLMPricingRules>>,
	TError,
	{ data: BodyType<LlmpricingruletypesUpdatableLLMPricingRulesDTO> },
	TContext
> => {
	const mutationKey = ['createOrUpdateLLMPricingRules'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof createOrUpdateLLMPricingRules>>,
		{ data: BodyType<LlmpricingruletypesUpdatableLLMPricingRulesDTO> }
	> = (props) => {
		const { data } = props ?? {};

		return createOrUpdateLLMPricingRules(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type CreateOrUpdateLLMPricingRulesMutationResult = NonNullable<
	Awaited<ReturnType<typeof createOrUpdateLLMPricingRules>>
>;
export type CreateOrUpdateLLMPricingRulesMutationBody =
	BodyType<LlmpricingruletypesUpdatableLLMPricingRulesDTO>;
export type CreateOrUpdateLLMPricingRulesMutationError =
	ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Create or update pricing rules
 */
export const useCreateOrUpdateLLMPricingRules = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createOrUpdateLLMPricingRules>>,
		TError,
		{ data: BodyType<LlmpricingruletypesUpdatableLLMPricingRulesDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createOrUpdateLLMPricingRules>>,
	TError,
	{ data: BodyType<LlmpricingruletypesUpdatableLLMPricingRulesDTO> },
	TContext
> => {
	const mutationOptions =
		getCreateOrUpdateLLMPricingRulesMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * Hard-deletes a pricing rule. If auto-synced, it will be recreated on the next sync cycle.
 * @summary Delete a pricing rule
 */
export const deleteLLMPricingRule = ({
	id,
}: DeleteLLMPricingRulePathParameters) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v1/llm_pricing_rules/${id}`,
		method: 'DELETE',
	});
};

export const getDeleteLLMPricingRuleMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteLLMPricingRule>>,
		TError,
		{ pathParams: DeleteLLMPricingRulePathParameters },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof deleteLLMPricingRule>>,
	TError,
	{ pathParams: DeleteLLMPricingRulePathParameters },
	TContext
> => {
	const mutationKey = ['deleteLLMPricingRule'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof deleteLLMPricingRule>>,
		{ pathParams: DeleteLLMPricingRulePathParameters }
	> = (props) => {
		const { pathParams } = props ?? {};

		return deleteLLMPricingRule(pathParams);
	};

	return { mutationFn, ...mutationOptions };
};

export type DeleteLLMPricingRuleMutationResult = NonNullable<
	Awaited<ReturnType<typeof deleteLLMPricingRule>>
>;

export type DeleteLLMPricingRuleMutationError =
	ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Delete a pricing rule
 */
export const useDeleteLLMPricingRule = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteLLMPricingRule>>,
		TError,
		{ pathParams: DeleteLLMPricingRulePathParameters },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof deleteLLMPricingRule>>,
	TError,
	{ pathParams: DeleteLLMPricingRulePathParameters },
	TContext
> => {
	const mutationOptions = getDeleteLLMPricingRuleMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * Returns a single LLM pricing rule by ID.
 * @summary Get a pricing rule
 */
export const getLLMPricingRule = (
	{ id }: GetLLMPricingRulePathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetLLMPricingRule200>({
		url: `/api/v1/llm_pricing_rules/${id}`,
		method: 'GET',
		signal,
	});
};

export const getGetLLMPricingRuleQueryKey = ({
	id,
}: GetLLMPricingRulePathParameters) => {
	return [`/api/v1/llm_pricing_rules/${id}`] as const;
};

export const getGetLLMPricingRuleQueryOptions = <
	TData = Awaited<ReturnType<typeof getLLMPricingRule>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ id }: GetLLMPricingRulePathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getLLMPricingRule>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ?? getGetLLMPricingRuleQueryKey({ id });

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof getLLMPricingRule>>
	> = ({ signal }) => getLLMPricingRule({ id }, signal);

	return {
		queryKey,
		queryFn,
		enabled: !!id,
		...queryOptions,
	} as UseQueryOptions<
		Awaited<ReturnType<typeof getLLMPricingRule>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetLLMPricingRuleQueryResult = NonNullable<
	Awaited<ReturnType<typeof getLLMPricingRule>>
>;
export type GetLLMPricingRuleQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get a pricing rule
 */

export function useGetLLMPricingRule<
	TData = Awaited<ReturnType<typeof getLLMPricingRule>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ id }: GetLLMPricingRulePathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getLLMPricingRule>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetLLMPricingRuleQueryOptions({ id }, options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary Get a pricing rule
 */
export const invalidateGetLLMPricingRule = async (
	queryClient: QueryClient,
	{ id }: GetLLMPricingRulePathParameters,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetLLMPricingRuleQueryKey({ id }) },
		options,
	);

	return queryClient;
};
