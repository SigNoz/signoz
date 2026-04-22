/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'yarn generate:api'
 * SigNoz
 */
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
import { useMutation, useQuery } from 'react-query';

import type { BodyType, ErrorType } from '../../../generatedAPIInstance';
import { GeneratedAPIInstance } from '../../../generatedAPIInstance';
import type {
	Aio11YpricingruletypesPostablePricingRuleDTO,
	Aio11YpricingruletypesSyncPricingRulesRequestDTO,
	Aio11YpricingruletypesUpdatablePricingRuleDTO,
	CreatePricingRule201,
	DeletePricingRulePathParameters,
	GetPricingRule200,
	GetPricingRulePathParameters,
	ListPricingRules200,
	ListPricingRulesParams,
	RenderErrorResponseDTO,
	UpdatePricingRulePathParameters,
} from '../sigNoz.schemas';

/**
 * Returns all LLM pricing rules for the authenticated org, with pagination.
 * @summary List pricing rules
 */
export const listPricingRules = (
	params?: ListPricingRulesParams,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<ListPricingRules200>({
		url: `/api/v1/ai-o11y/pricing_rules`,
		method: 'GET',
		params,
		signal,
	});
};

export const getListPricingRulesQueryKey = (
	params?: ListPricingRulesParams,
) => {
	return [`/api/v1/ai-o11y/pricing_rules`, ...(params ? [params] : [])] as const;
};

export const getListPricingRulesQueryOptions = <
	TData = Awaited<ReturnType<typeof listPricingRules>>,
	TError = ErrorType<RenderErrorResponseDTO>
>(
	params?: ListPricingRulesParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof listPricingRules>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey = queryOptions?.queryKey ?? getListPricingRulesQueryKey(params);

	const queryFn: QueryFunction<Awaited<ReturnType<typeof listPricingRules>>> = ({
		signal,
	}) => listPricingRules(params, signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof listPricingRules>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type ListPricingRulesQueryResult = NonNullable<
	Awaited<ReturnType<typeof listPricingRules>>
>;
export type ListPricingRulesQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary List pricing rules
 */

export function useListPricingRules<
	TData = Awaited<ReturnType<typeof listPricingRules>>,
	TError = ErrorType<RenderErrorResponseDTO>
>(
	params?: ListPricingRulesParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof listPricingRules>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getListPricingRulesQueryOptions(params, options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary List pricing rules
 */
export const invalidateListPricingRules = async (
	queryClient: QueryClient,
	params?: ListPricingRulesParams,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getListPricingRulesQueryKey(params) },
		options,
	);

	return queryClient;
};

/**
 * Creates a new LLM pricing rule for the org. Always sets is_override = true.
 * @summary Create a pricing rule
 */
export const createPricingRule = (
	aio11YpricingruletypesPostablePricingRuleDTO: BodyType<Aio11YpricingruletypesPostablePricingRuleDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<CreatePricingRule201>({
		url: `/api/v1/ai-o11y/pricing_rules`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: aio11YpricingruletypesPostablePricingRuleDTO,
		signal,
	});
};

export const getCreatePricingRuleMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createPricingRule>>,
		TError,
		{ data: BodyType<Aio11YpricingruletypesPostablePricingRuleDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createPricingRule>>,
	TError,
	{ data: BodyType<Aio11YpricingruletypesPostablePricingRuleDTO> },
	TContext
> => {
	const mutationKey = ['createPricingRule'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
		  'mutationKey' in options.mutation &&
		  options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof createPricingRule>>,
		{ data: BodyType<Aio11YpricingruletypesPostablePricingRuleDTO> }
	> = (props) => {
		const { data } = props ?? {};

		return createPricingRule(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type CreatePricingRuleMutationResult = NonNullable<
	Awaited<ReturnType<typeof createPricingRule>>
>;
export type CreatePricingRuleMutationBody = BodyType<Aio11YpricingruletypesPostablePricingRuleDTO>;
export type CreatePricingRuleMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Create a pricing rule
 */
export const useCreatePricingRule = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createPricingRule>>,
		TError,
		{ data: BodyType<Aio11YpricingruletypesPostablePricingRuleDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createPricingRule>>,
	TError,
	{ data: BodyType<Aio11YpricingruletypesPostablePricingRuleDTO> },
	TContext
> => {
	const mutationOptions = getCreatePricingRuleMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * Hard-deletes a pricing rule. If auto-synced, it will be recreated on the next sync cycle.
 * @summary Delete a pricing rule
 */
export const deletePricingRule = ({ id }: DeletePricingRulePathParameters) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v1/ai-o11y/pricing_rules/${id}`,
		method: 'DELETE',
	});
};

export const getDeletePricingRuleMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deletePricingRule>>,
		TError,
		{ pathParams: DeletePricingRulePathParameters },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof deletePricingRule>>,
	TError,
	{ pathParams: DeletePricingRulePathParameters },
	TContext
> => {
	const mutationKey = ['deletePricingRule'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
		  'mutationKey' in options.mutation &&
		  options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof deletePricingRule>>,
		{ pathParams: DeletePricingRulePathParameters }
	> = (props) => {
		const { pathParams } = props ?? {};

		return deletePricingRule(pathParams);
	};

	return { mutationFn, ...mutationOptions };
};

export type DeletePricingRuleMutationResult = NonNullable<
	Awaited<ReturnType<typeof deletePricingRule>>
>;

export type DeletePricingRuleMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Delete a pricing rule
 */
export const useDeletePricingRule = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deletePricingRule>>,
		TError,
		{ pathParams: DeletePricingRulePathParameters },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof deletePricingRule>>,
	TError,
	{ pathParams: DeletePricingRulePathParameters },
	TContext
> => {
	const mutationOptions = getDeletePricingRuleMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * Returns a single LLM pricing rule by ID.
 * @summary Get a pricing rule
 */
export const getPricingRule = (
	{ id }: GetPricingRulePathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetPricingRule200>({
		url: `/api/v1/ai-o11y/pricing_rules/${id}`,
		method: 'GET',
		signal,
	});
};

export const getGetPricingRuleQueryKey = ({
	id,
}: GetPricingRulePathParameters) => {
	return [`/api/v1/ai-o11y/pricing_rules/${id}`] as const;
};

export const getGetPricingRuleQueryOptions = <
	TData = Awaited<ReturnType<typeof getPricingRule>>,
	TError = ErrorType<RenderErrorResponseDTO>
>(
	{ id }: GetPricingRulePathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getPricingRule>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey = queryOptions?.queryKey ?? getGetPricingRuleQueryKey({ id });

	const queryFn: QueryFunction<Awaited<ReturnType<typeof getPricingRule>>> = ({
		signal,
	}) => getPricingRule({ id }, signal);

	return {
		queryKey,
		queryFn,
		enabled: !!id,
		...queryOptions,
	} as UseQueryOptions<
		Awaited<ReturnType<typeof getPricingRule>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetPricingRuleQueryResult = NonNullable<
	Awaited<ReturnType<typeof getPricingRule>>
>;
export type GetPricingRuleQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get a pricing rule
 */

export function useGetPricingRule<
	TData = Awaited<ReturnType<typeof getPricingRule>>,
	TError = ErrorType<RenderErrorResponseDTO>
>(
	{ id }: GetPricingRulePathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getPricingRule>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetPricingRuleQueryOptions({ id }, options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary Get a pricing rule
 */
export const invalidateGetPricingRule = async (
	queryClient: QueryClient,
	{ id }: GetPricingRulePathParameters,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetPricingRuleQueryKey({ id }) },
		options,
	);

	return queryClient;
};

/**
 * Partially updates an existing pricing rule. Changing any cost field sets is_override = true.
 * @summary Update a pricing rule
 */
export const updatePricingRule = (
	{ id }: UpdatePricingRulePathParameters,
	aio11YpricingruletypesUpdatablePricingRuleDTO: BodyType<Aio11YpricingruletypesUpdatablePricingRuleDTO>,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v1/ai-o11y/pricing_rules/${id}`,
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		data: aio11YpricingruletypesUpdatablePricingRuleDTO,
	});
};

export const getUpdatePricingRuleMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updatePricingRule>>,
		TError,
		{
			pathParams: UpdatePricingRulePathParameters;
			data: BodyType<Aio11YpricingruletypesUpdatablePricingRuleDTO>;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updatePricingRule>>,
	TError,
	{
		pathParams: UpdatePricingRulePathParameters;
		data: BodyType<Aio11YpricingruletypesUpdatablePricingRuleDTO>;
	},
	TContext
> => {
	const mutationKey = ['updatePricingRule'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
		  'mutationKey' in options.mutation &&
		  options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof updatePricingRule>>,
		{
			pathParams: UpdatePricingRulePathParameters;
			data: BodyType<Aio11YpricingruletypesUpdatablePricingRuleDTO>;
		}
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return updatePricingRule(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type UpdatePricingRuleMutationResult = NonNullable<
	Awaited<ReturnType<typeof updatePricingRule>>
>;
export type UpdatePricingRuleMutationBody = BodyType<Aio11YpricingruletypesUpdatablePricingRuleDTO>;
export type UpdatePricingRuleMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Update a pricing rule
 */
export const useUpdatePricingRule = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updatePricingRule>>,
		TError,
		{
			pathParams: UpdatePricingRulePathParameters;
			data: BodyType<Aio11YpricingruletypesUpdatablePricingRuleDTO>;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updatePricingRule>>,
	TError,
	{
		pathParams: UpdatePricingRulePathParameters;
		data: BodyType<Aio11YpricingruletypesUpdatablePricingRuleDTO>;
	},
	TContext
> => {
	const mutationOptions = getUpdatePricingRuleMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * Zeus bulk-upserts upstream pricing. Non-override rules get costs updated; override rules get only SourceConfig refreshed.
 * @summary Bulk sync pricing rules
 */
export const syncPricingRules = (
	aio11YpricingruletypesSyncPricingRulesRequestDTO: BodyType<Aio11YpricingruletypesSyncPricingRulesRequestDTO>,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v1/ai-o11y/pricing_rules/sync`,
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		data: aio11YpricingruletypesSyncPricingRulesRequestDTO,
	});
};

export const getSyncPricingRulesMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof syncPricingRules>>,
		TError,
		{ data: BodyType<Aio11YpricingruletypesSyncPricingRulesRequestDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof syncPricingRules>>,
	TError,
	{ data: BodyType<Aio11YpricingruletypesSyncPricingRulesRequestDTO> },
	TContext
> => {
	const mutationKey = ['syncPricingRules'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
		  'mutationKey' in options.mutation &&
		  options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof syncPricingRules>>,
		{ data: BodyType<Aio11YpricingruletypesSyncPricingRulesRequestDTO> }
	> = (props) => {
		const { data } = props ?? {};

		return syncPricingRules(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type SyncPricingRulesMutationResult = NonNullable<
	Awaited<ReturnType<typeof syncPricingRules>>
>;
export type SyncPricingRulesMutationBody = BodyType<Aio11YpricingruletypesSyncPricingRulesRequestDTO>;
export type SyncPricingRulesMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Bulk sync pricing rules
 */
export const useSyncPricingRules = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof syncPricingRules>>,
		TError,
		{ data: BodyType<Aio11YpricingruletypesSyncPricingRulesRequestDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof syncPricingRules>>,
	TError,
	{ data: BodyType<Aio11YpricingruletypesSyncPricingRulesRequestDTO> },
	TContext
> => {
	const mutationOptions = getSyncPricingRulesMutationOptions(options);

	return useMutation(mutationOptions);
};
