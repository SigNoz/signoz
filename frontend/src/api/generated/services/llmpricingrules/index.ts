/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
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

import type { DeleteLLMPricingRulePathParameters } from '../sigNoz.schemas/deleteLLMPricingRulePathParameters';

import type { GetLLMPricingRule200 } from '../sigNoz.schemas/getLLMPricingRule200';

import type { GetLLMPricingRulePathParameters } from '../sigNoz.schemas/getLLMPricingRulePathParameters';

import type { ListLLMPricingRules200 } from '../sigNoz.schemas/listLLMPricingRules200';

import type { ListLLMPricingRulesParams } from '../sigNoz.schemas/listLLMPricingRulesParams';

import type { ListUnmappedLLMModels200 } from '../sigNoz.schemas/listUnmappedLLMModels200';

import type { LlmpricingruletypesUpdatableLLMPricingRulesDTO } from '../sigNoz.schemas/llmpricingruletypesUpdatableLLMPricingRulesDTO';

import type { RenderErrorResponseDTO } from '../sigNoz.schemas/renderErrorResponseDTO';

import { GeneratedAPIInstance } from '../../../generatedAPIInstance';
import type { ErrorType, BodyType } from '../../../generatedAPIInstance';

const withQueryKey = <T extends object, K>(
	query: T,
	queryKey: K,
): T & { queryKey: K } => {
	const result = { queryKey } as T & { queryKey: K };
	for (const key of Object.keys(query)) {
		// The explicit queryKey always wins, matching the previous
		// `{ ...query, queryKey }` spread where it was set last.
		if (key === 'queryKey') {
			continue;
		}
		Object.defineProperty(result, key, {
			enumerable: true,
			configurable: true,
			get: () => (query as Record<string, unknown>)[key],
		});
	}
	return result;
};

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

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useListLLMPricingRules} query
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
 * Single write endpoint used by both the user and the Zeus sync job. Rules without isOverride are matched by sourceId and override rows (is_override=true) are skipped. Rules with isOverride are matched by id and inserted when new.
 * @summary Create or update pricing rules
 */
export const createOrUpdateLLMPricingRules = (
	llmpricingruletypesUpdatableLLMPricingRulesDTO?: BodyType<LlmpricingruletypesUpdatableLLMPricingRulesDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v1/llm_pricing_rules`,
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		data: llmpricingruletypesUpdatableLLMPricingRulesDTO,
		signal,
	});
};

export const getCreateOrUpdateLLMPricingRulesMutationKey = () =>
	['createOrUpdateLLMPricingRules'] as const;

export const getCreateOrUpdateLLMPricingRulesMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createOrUpdateLLMPricingRules>>,
		TError,
		CreateOrUpdateLLMPricingRulesMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createOrUpdateLLMPricingRules>>,
	TError,
	CreateOrUpdateLLMPricingRulesMutationVariables,
	TContext
> => {
	const mutationKey = getCreateOrUpdateLLMPricingRulesMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof createOrUpdateLLMPricingRules>>,
		CreateOrUpdateLLMPricingRulesMutationVariables
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
	| BodyType<LlmpricingruletypesUpdatableLLMPricingRulesDTO>
	| undefined;
export type CreateOrUpdateLLMPricingRulesMutationError =
	ErrorType<RenderErrorResponseDTO>;
export type CreateOrUpdateLLMPricingRulesMutationVariables = {
	data?: BodyType<LlmpricingruletypesUpdatableLLMPricingRulesDTO>;
};

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
		CreateOrUpdateLLMPricingRulesMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createOrUpdateLLMPricingRules>>,
	TError,
	CreateOrUpdateLLMPricingRulesMutationVariables,
	TContext
> => {
	return useMutation(getCreateOrUpdateLLMPricingRulesMutationOptions(options));
};
/**
 * Hard-deletes a pricing rule. If auto-synced, it will be recreated on the next sync cycle.
 * @summary Delete a pricing rule
 */
export const deleteLLMPricingRule = (
	{ id }: DeleteLLMPricingRulePathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v1/llm_pricing_rules/${id}`,
		method: 'DELETE',
		signal,
	});
};

export const getDeleteLLMPricingRuleMutationKey = () =>
	['deleteLLMPricingRule'] as const;

export const getDeleteLLMPricingRuleMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteLLMPricingRule>>,
		TError,
		DeleteLLMPricingRuleMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof deleteLLMPricingRule>>,
	TError,
	DeleteLLMPricingRuleMutationVariables,
	TContext
> => {
	const mutationKey = getDeleteLLMPricingRuleMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof deleteLLMPricingRule>>,
		DeleteLLMPricingRuleMutationVariables
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
export type DeleteLLMPricingRuleMutationVariables = {
	pathParams: DeleteLLMPricingRulePathParameters;
};

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
		DeleteLLMPricingRuleMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof deleteLLMPricingRule>>,
	TError,
	DeleteLLMPricingRuleMutationVariables,
	TContext
> => {
	return useMutation(getDeleteLLMPricingRuleMutationOptions(options));
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
		enabled: id !== null && id !== undefined,
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

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useGetLLMPricingRule} query
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

/**
 * Returns models seen in the last hour of trace data (gen_ai.request.model) that no pricing rule pattern matches, so the user can add them to an existing rule or create a new one.
 * @summary List unmapped models
 */
export const listUnmappedLLMModels = (signal?: AbortSignal) => {
	return GeneratedAPIInstance<ListUnmappedLLMModels200>({
		url: `/api/v1/llm_pricing_rules/unmapped_models`,
		method: 'GET',
		signal,
	});
};

export const getListUnmappedLLMModelsQueryKey = () => {
	return [`/api/v1/llm_pricing_rules/unmapped_models`] as const;
};

export const getListUnmappedLLMModelsQueryOptions = <
	TData = Awaited<ReturnType<typeof listUnmappedLLMModels>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof listUnmappedLLMModels>>,
		TError,
		TData
	>;
}) => {
	const { query: queryOptions } = options ?? {};

	const queryKey = queryOptions?.queryKey ?? getListUnmappedLLMModelsQueryKey();

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof listUnmappedLLMModels>>
	> = ({ signal }) => listUnmappedLLMModels(signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof listUnmappedLLMModels>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type ListUnmappedLLMModelsQueryResult = NonNullable<
	Awaited<ReturnType<typeof listUnmappedLLMModels>>
>;
export type ListUnmappedLLMModelsQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary List unmapped models
 */

export function useListUnmappedLLMModels<
	TData = Awaited<ReturnType<typeof listUnmappedLLMModels>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(options?: {
	query?: UseQueryOptions<
		Awaited<ReturnType<typeof listUnmappedLLMModels>>,
		TError,
		TData
	>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getListUnmappedLLMModelsQueryOptions(options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	return withQueryKey(query, queryOptions.queryKey);
}

/**
 * @summary Invalidates the {@link useListUnmappedLLMModels} query
 */
export const invalidateListUnmappedLLMModels = async (
	queryClient: QueryClient,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getListUnmappedLLMModelsQueryKey() },
		options,
	);

	return queryClient;
};
