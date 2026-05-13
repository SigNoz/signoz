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

import type {
	CreateRule201,
	DeleteRuleByIDPathParameters,
	GetRuleByID200,
	GetRuleByIDPathParameters,
	GetRuleHistoryFilterKeys200,
	GetRuleHistoryFilterKeysParams,
	GetRuleHistoryFilterKeysPathParameters,
	GetRuleHistoryFilterValues200,
	GetRuleHistoryFilterValuesParams,
	GetRuleHistoryFilterValuesPathParameters,
	GetRuleHistoryOverallStatus200,
	GetRuleHistoryOverallStatusParams,
	GetRuleHistoryOverallStatusPathParameters,
	GetRuleHistoryStats200,
	GetRuleHistoryStatsParams,
	GetRuleHistoryStatsPathParameters,
	GetRuleHistoryTimeline200,
	GetRuleHistoryTimelineParams,
	GetRuleHistoryTimelinePathParameters,
	GetRuleHistoryTopContributors200,
	GetRuleHistoryTopContributorsParams,
	GetRuleHistoryTopContributorsPathParameters,
	ListRules200,
	PatchRuleByID200,
	PatchRuleByIDPathParameters,
	RenderErrorResponseDTO,
	RuletypesPostableRuleDTO,
	TestRule200,
	UpdateRuleByIDPathParameters,
} from '../sigNoz.schemas';

import { GeneratedAPIInstance } from '../../../generatedAPIInstance';
import type { ErrorType, BodyType } from '../../../generatedAPIInstance';

/**
 * This endpoint lists all alert rules with their current evaluation state
 * @summary List alert rules
 */
export const listRules = (signal?: AbortSignal) => {
	return GeneratedAPIInstance<ListRules200>({
		url: `/api/v2/rules`,
		method: 'GET',
		signal,
	});
};

export const getListRulesQueryKey = () => {
	return [`/api/v2/rules`] as const;
};

export const getListRulesQueryOptions = <
	TData = Awaited<ReturnType<typeof listRules>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(options?: {
	query?: UseQueryOptions<Awaited<ReturnType<typeof listRules>>, TError, TData>;
}) => {
	const { query: queryOptions } = options ?? {};

	const queryKey = queryOptions?.queryKey ?? getListRulesQueryKey();

	const queryFn: QueryFunction<Awaited<ReturnType<typeof listRules>>> = ({
		signal,
	}) => listRules(signal);

	return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
		Awaited<ReturnType<typeof listRules>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type ListRulesQueryResult = NonNullable<
	Awaited<ReturnType<typeof listRules>>
>;
export type ListRulesQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary List alert rules
 */

export function useListRules<
	TData = Awaited<ReturnType<typeof listRules>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(options?: {
	query?: UseQueryOptions<Awaited<ReturnType<typeof listRules>>, TError, TData>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getListRulesQueryOptions(options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary List alert rules
 */
export const invalidateListRules = async (
	queryClient: QueryClient,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getListRulesQueryKey() },
		options,
	);

	return queryClient;
};

/**
 * This endpoint creates a new alert rule
 * @summary Create alert rule
 */
export const createRule = (
	ruletypesPostableRuleDTO: BodyType<RuletypesPostableRuleDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<CreateRule201>({
		url: `/api/v2/rules`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: ruletypesPostableRuleDTO,
		signal,
	});
};

export const getCreateRuleMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createRule>>,
		TError,
		{ data: BodyType<RuletypesPostableRuleDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof createRule>>,
	TError,
	{ data: BodyType<RuletypesPostableRuleDTO> },
	TContext
> => {
	const mutationKey = ['createRule'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof createRule>>,
		{ data: BodyType<RuletypesPostableRuleDTO> }
	> = (props) => {
		const { data } = props ?? {};

		return createRule(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type CreateRuleMutationResult = NonNullable<
	Awaited<ReturnType<typeof createRule>>
>;
export type CreateRuleMutationBody = BodyType<RuletypesPostableRuleDTO>;
export type CreateRuleMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Create alert rule
 */
export const useCreateRule = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof createRule>>,
		TError,
		{ data: BodyType<RuletypesPostableRuleDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof createRule>>,
	TError,
	{ data: BodyType<RuletypesPostableRuleDTO> },
	TContext
> => {
	const mutationOptions = getCreateRuleMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * This endpoint deletes an alert rule by ID
 * @summary Delete alert rule
 */
export const deleteRuleByID = ({ id }: DeleteRuleByIDPathParameters) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v2/rules/${id}`,
		method: 'DELETE',
	});
};

export const getDeleteRuleByIDMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteRuleByID>>,
		TError,
		{ pathParams: DeleteRuleByIDPathParameters },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof deleteRuleByID>>,
	TError,
	{ pathParams: DeleteRuleByIDPathParameters },
	TContext
> => {
	const mutationKey = ['deleteRuleByID'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof deleteRuleByID>>,
		{ pathParams: DeleteRuleByIDPathParameters }
	> = (props) => {
		const { pathParams } = props ?? {};

		return deleteRuleByID(pathParams);
	};

	return { mutationFn, ...mutationOptions };
};

export type DeleteRuleByIDMutationResult = NonNullable<
	Awaited<ReturnType<typeof deleteRuleByID>>
>;

export type DeleteRuleByIDMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Delete alert rule
 */
export const useDeleteRuleByID = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof deleteRuleByID>>,
		TError,
		{ pathParams: DeleteRuleByIDPathParameters },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof deleteRuleByID>>,
	TError,
	{ pathParams: DeleteRuleByIDPathParameters },
	TContext
> => {
	const mutationOptions = getDeleteRuleByIDMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * This endpoint returns an alert rule by ID
 * @summary Get alert rule by ID
 */
export const getRuleByID = (
	{ id }: GetRuleByIDPathParameters,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetRuleByID200>({
		url: `/api/v2/rules/${id}`,
		method: 'GET',
		signal,
	});
};

export const getGetRuleByIDQueryKey = ({ id }: GetRuleByIDPathParameters) => {
	return [`/api/v2/rules/${id}`] as const;
};

export const getGetRuleByIDQueryOptions = <
	TData = Awaited<ReturnType<typeof getRuleByID>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ id }: GetRuleByIDPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getRuleByID>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey = queryOptions?.queryKey ?? getGetRuleByIDQueryKey({ id });

	const queryFn: QueryFunction<Awaited<ReturnType<typeof getRuleByID>>> = ({
		signal,
	}) => getRuleByID({ id }, signal);

	return {
		queryKey,
		queryFn,
		enabled: !!id,
		...queryOptions,
	} as UseQueryOptions<
		Awaited<ReturnType<typeof getRuleByID>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetRuleByIDQueryResult = NonNullable<
	Awaited<ReturnType<typeof getRuleByID>>
>;
export type GetRuleByIDQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get alert rule by ID
 */

export function useGetRuleByID<
	TData = Awaited<ReturnType<typeof getRuleByID>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ id }: GetRuleByIDPathParameters,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getRuleByID>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetRuleByIDQueryOptions({ id }, options);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary Get alert rule by ID
 */
export const invalidateGetRuleByID = async (
	queryClient: QueryClient,
	{ id }: GetRuleByIDPathParameters,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetRuleByIDQueryKey({ id }) },
		options,
	);

	return queryClient;
};

/**
 * This endpoint applies a partial update to an alert rule by ID
 * @summary Patch alert rule
 */
export const patchRuleByID = (
	{ id }: PatchRuleByIDPathParameters,
	ruletypesPostableRuleDTO: BodyType<RuletypesPostableRuleDTO>,
) => {
	return GeneratedAPIInstance<PatchRuleByID200>({
		url: `/api/v2/rules/${id}`,
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		data: ruletypesPostableRuleDTO,
	});
};

export const getPatchRuleByIDMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof patchRuleByID>>,
		TError,
		{
			pathParams: PatchRuleByIDPathParameters;
			data: BodyType<RuletypesPostableRuleDTO>;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof patchRuleByID>>,
	TError,
	{
		pathParams: PatchRuleByIDPathParameters;
		data: BodyType<RuletypesPostableRuleDTO>;
	},
	TContext
> => {
	const mutationKey = ['patchRuleByID'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof patchRuleByID>>,
		{
			pathParams: PatchRuleByIDPathParameters;
			data: BodyType<RuletypesPostableRuleDTO>;
		}
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return patchRuleByID(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type PatchRuleByIDMutationResult = NonNullable<
	Awaited<ReturnType<typeof patchRuleByID>>
>;
export type PatchRuleByIDMutationBody = BodyType<RuletypesPostableRuleDTO>;
export type PatchRuleByIDMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Patch alert rule
 */
export const usePatchRuleByID = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof patchRuleByID>>,
		TError,
		{
			pathParams: PatchRuleByIDPathParameters;
			data: BodyType<RuletypesPostableRuleDTO>;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof patchRuleByID>>,
	TError,
	{
		pathParams: PatchRuleByIDPathParameters;
		data: BodyType<RuletypesPostableRuleDTO>;
	},
	TContext
> => {
	const mutationOptions = getPatchRuleByIDMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * This endpoint updates an alert rule by ID
 * @summary Update alert rule
 */
export const updateRuleByID = (
	{ id }: UpdateRuleByIDPathParameters,
	ruletypesPostableRuleDTO: BodyType<RuletypesPostableRuleDTO>,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v2/rules/${id}`,
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		data: ruletypesPostableRuleDTO,
	});
};

export const getUpdateRuleByIDMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateRuleByID>>,
		TError,
		{
			pathParams: UpdateRuleByIDPathParameters;
			data: BodyType<RuletypesPostableRuleDTO>;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof updateRuleByID>>,
	TError,
	{
		pathParams: UpdateRuleByIDPathParameters;
		data: BodyType<RuletypesPostableRuleDTO>;
	},
	TContext
> => {
	const mutationKey = ['updateRuleByID'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof updateRuleByID>>,
		{
			pathParams: UpdateRuleByIDPathParameters;
			data: BodyType<RuletypesPostableRuleDTO>;
		}
	> = (props) => {
		const { pathParams, data } = props ?? {};

		return updateRuleByID(pathParams, data);
	};

	return { mutationFn, ...mutationOptions };
};

export type UpdateRuleByIDMutationResult = NonNullable<
	Awaited<ReturnType<typeof updateRuleByID>>
>;
export type UpdateRuleByIDMutationBody = BodyType<RuletypesPostableRuleDTO>;
export type UpdateRuleByIDMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Update alert rule
 */
export const useUpdateRuleByID = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof updateRuleByID>>,
		TError,
		{
			pathParams: UpdateRuleByIDPathParameters;
			data: BodyType<RuletypesPostableRuleDTO>;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof updateRuleByID>>,
	TError,
	{
		pathParams: UpdateRuleByIDPathParameters;
		data: BodyType<RuletypesPostableRuleDTO>;
	},
	TContext
> => {
	const mutationOptions = getUpdateRuleByIDMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * Returns distinct label keys from rule history entries for the selected range.
 * @summary Get rule history filter keys
 */
export const getRuleHistoryFilterKeys = (
	{ id }: GetRuleHistoryFilterKeysPathParameters,
	params?: GetRuleHistoryFilterKeysParams,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetRuleHistoryFilterKeys200>({
		url: `/api/v2/rules/${id}/history/filter_keys`,
		method: 'GET',
		params,
		signal,
	});
};

export const getGetRuleHistoryFilterKeysQueryKey = (
	{ id }: GetRuleHistoryFilterKeysPathParameters,
	params?: GetRuleHistoryFilterKeysParams,
) => {
	return [
		`/api/v2/rules/${id}/history/filter_keys`,
		...(params ? [params] : []),
	] as const;
};

export const getGetRuleHistoryFilterKeysQueryOptions = <
	TData = Awaited<ReturnType<typeof getRuleHistoryFilterKeys>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ id }: GetRuleHistoryFilterKeysPathParameters,
	params?: GetRuleHistoryFilterKeysParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getRuleHistoryFilterKeys>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ?? getGetRuleHistoryFilterKeysQueryKey({ id }, params);

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof getRuleHistoryFilterKeys>>
	> = ({ signal }) => getRuleHistoryFilterKeys({ id }, params, signal);

	return {
		queryKey,
		queryFn,
		enabled: !!id,
		...queryOptions,
	} as UseQueryOptions<
		Awaited<ReturnType<typeof getRuleHistoryFilterKeys>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetRuleHistoryFilterKeysQueryResult = NonNullable<
	Awaited<ReturnType<typeof getRuleHistoryFilterKeys>>
>;
export type GetRuleHistoryFilterKeysQueryError =
	ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get rule history filter keys
 */

export function useGetRuleHistoryFilterKeys<
	TData = Awaited<ReturnType<typeof getRuleHistoryFilterKeys>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ id }: GetRuleHistoryFilterKeysPathParameters,
	params?: GetRuleHistoryFilterKeysParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getRuleHistoryFilterKeys>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetRuleHistoryFilterKeysQueryOptions(
		{ id },
		params,
		options,
	);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary Get rule history filter keys
 */
export const invalidateGetRuleHistoryFilterKeys = async (
	queryClient: QueryClient,
	{ id }: GetRuleHistoryFilterKeysPathParameters,
	params?: GetRuleHistoryFilterKeysParams,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetRuleHistoryFilterKeysQueryKey({ id }, params) },
		options,
	);

	return queryClient;
};

/**
 * Returns distinct label values for a given key from rule history entries.
 * @summary Get rule history filter values
 */
export const getRuleHistoryFilterValues = (
	{ id }: GetRuleHistoryFilterValuesPathParameters,
	params?: GetRuleHistoryFilterValuesParams,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetRuleHistoryFilterValues200>({
		url: `/api/v2/rules/${id}/history/filter_values`,
		method: 'GET',
		params,
		signal,
	});
};

export const getGetRuleHistoryFilterValuesQueryKey = (
	{ id }: GetRuleHistoryFilterValuesPathParameters,
	params?: GetRuleHistoryFilterValuesParams,
) => {
	return [
		`/api/v2/rules/${id}/history/filter_values`,
		...(params ? [params] : []),
	] as const;
};

export const getGetRuleHistoryFilterValuesQueryOptions = <
	TData = Awaited<ReturnType<typeof getRuleHistoryFilterValues>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ id }: GetRuleHistoryFilterValuesPathParameters,
	params?: GetRuleHistoryFilterValuesParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getRuleHistoryFilterValues>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ??
		getGetRuleHistoryFilterValuesQueryKey({ id }, params);

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof getRuleHistoryFilterValues>>
	> = ({ signal }) => getRuleHistoryFilterValues({ id }, params, signal);

	return {
		queryKey,
		queryFn,
		enabled: !!id,
		...queryOptions,
	} as UseQueryOptions<
		Awaited<ReturnType<typeof getRuleHistoryFilterValues>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetRuleHistoryFilterValuesQueryResult = NonNullable<
	Awaited<ReturnType<typeof getRuleHistoryFilterValues>>
>;
export type GetRuleHistoryFilterValuesQueryError =
	ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get rule history filter values
 */

export function useGetRuleHistoryFilterValues<
	TData = Awaited<ReturnType<typeof getRuleHistoryFilterValues>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ id }: GetRuleHistoryFilterValuesPathParameters,
	params?: GetRuleHistoryFilterValuesParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getRuleHistoryFilterValues>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetRuleHistoryFilterValuesQueryOptions(
		{ id },
		params,
		options,
	);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary Get rule history filter values
 */
export const invalidateGetRuleHistoryFilterValues = async (
	queryClient: QueryClient,
	{ id }: GetRuleHistoryFilterValuesPathParameters,
	params?: GetRuleHistoryFilterValuesParams,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetRuleHistoryFilterValuesQueryKey({ id }, params) },
		options,
	);

	return queryClient;
};

/**
 * Returns overall firing/inactive intervals for a rule in the selected time range.
 * @summary Get rule overall status timeline
 */
export const getRuleHistoryOverallStatus = (
	{ id }: GetRuleHistoryOverallStatusPathParameters,
	params: GetRuleHistoryOverallStatusParams,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetRuleHistoryOverallStatus200>({
		url: `/api/v2/rules/${id}/history/overall_status`,
		method: 'GET',
		params,
		signal,
	});
};

export const getGetRuleHistoryOverallStatusQueryKey = (
	{ id }: GetRuleHistoryOverallStatusPathParameters,
	params?: GetRuleHistoryOverallStatusParams,
) => {
	return [
		`/api/v2/rules/${id}/history/overall_status`,
		...(params ? [params] : []),
	] as const;
};

export const getGetRuleHistoryOverallStatusQueryOptions = <
	TData = Awaited<ReturnType<typeof getRuleHistoryOverallStatus>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ id }: GetRuleHistoryOverallStatusPathParameters,
	params: GetRuleHistoryOverallStatusParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getRuleHistoryOverallStatus>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ??
		getGetRuleHistoryOverallStatusQueryKey({ id }, params);

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof getRuleHistoryOverallStatus>>
	> = ({ signal }) => getRuleHistoryOverallStatus({ id }, params, signal);

	return {
		queryKey,
		queryFn,
		enabled: !!id,
		...queryOptions,
	} as UseQueryOptions<
		Awaited<ReturnType<typeof getRuleHistoryOverallStatus>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetRuleHistoryOverallStatusQueryResult = NonNullable<
	Awaited<ReturnType<typeof getRuleHistoryOverallStatus>>
>;
export type GetRuleHistoryOverallStatusQueryError =
	ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get rule overall status timeline
 */

export function useGetRuleHistoryOverallStatus<
	TData = Awaited<ReturnType<typeof getRuleHistoryOverallStatus>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ id }: GetRuleHistoryOverallStatusPathParameters,
	params: GetRuleHistoryOverallStatusParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getRuleHistoryOverallStatus>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetRuleHistoryOverallStatusQueryOptions(
		{ id },
		params,
		options,
	);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary Get rule overall status timeline
 */
export const invalidateGetRuleHistoryOverallStatus = async (
	queryClient: QueryClient,
	{ id }: GetRuleHistoryOverallStatusPathParameters,
	params: GetRuleHistoryOverallStatusParams,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetRuleHistoryOverallStatusQueryKey({ id }, params) },
		options,
	);

	return queryClient;
};

/**
 * Returns trigger and resolution statistics for a rule in the selected time range.
 * @summary Get rule history stats
 */
export const getRuleHistoryStats = (
	{ id }: GetRuleHistoryStatsPathParameters,
	params: GetRuleHistoryStatsParams,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetRuleHistoryStats200>({
		url: `/api/v2/rules/${id}/history/stats`,
		method: 'GET',
		params,
		signal,
	});
};

export const getGetRuleHistoryStatsQueryKey = (
	{ id }: GetRuleHistoryStatsPathParameters,
	params?: GetRuleHistoryStatsParams,
) => {
	return [
		`/api/v2/rules/${id}/history/stats`,
		...(params ? [params] : []),
	] as const;
};

export const getGetRuleHistoryStatsQueryOptions = <
	TData = Awaited<ReturnType<typeof getRuleHistoryStats>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ id }: GetRuleHistoryStatsPathParameters,
	params: GetRuleHistoryStatsParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getRuleHistoryStats>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ?? getGetRuleHistoryStatsQueryKey({ id }, params);

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof getRuleHistoryStats>>
	> = ({ signal }) => getRuleHistoryStats({ id }, params, signal);

	return {
		queryKey,
		queryFn,
		enabled: !!id,
		...queryOptions,
	} as UseQueryOptions<
		Awaited<ReturnType<typeof getRuleHistoryStats>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetRuleHistoryStatsQueryResult = NonNullable<
	Awaited<ReturnType<typeof getRuleHistoryStats>>
>;
export type GetRuleHistoryStatsQueryError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get rule history stats
 */

export function useGetRuleHistoryStats<
	TData = Awaited<ReturnType<typeof getRuleHistoryStats>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ id }: GetRuleHistoryStatsPathParameters,
	params: GetRuleHistoryStatsParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getRuleHistoryStats>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetRuleHistoryStatsQueryOptions(
		{ id },
		params,
		options,
	);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary Get rule history stats
 */
export const invalidateGetRuleHistoryStats = async (
	queryClient: QueryClient,
	{ id }: GetRuleHistoryStatsPathParameters,
	params: GetRuleHistoryStatsParams,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetRuleHistoryStatsQueryKey({ id }, params) },
		options,
	);

	return queryClient;
};

/**
 * Returns paginated timeline entries for rule state transitions.
 * @summary Get rule history timeline
 */
export const getRuleHistoryTimeline = (
	{ id }: GetRuleHistoryTimelinePathParameters,
	params: GetRuleHistoryTimelineParams,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetRuleHistoryTimeline200>({
		url: `/api/v2/rules/${id}/history/timeline`,
		method: 'GET',
		params,
		signal,
	});
};

export const getGetRuleHistoryTimelineQueryKey = (
	{ id }: GetRuleHistoryTimelinePathParameters,
	params?: GetRuleHistoryTimelineParams,
) => {
	return [
		`/api/v2/rules/${id}/history/timeline`,
		...(params ? [params] : []),
	] as const;
};

export const getGetRuleHistoryTimelineQueryOptions = <
	TData = Awaited<ReturnType<typeof getRuleHistoryTimeline>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ id }: GetRuleHistoryTimelinePathParameters,
	params: GetRuleHistoryTimelineParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getRuleHistoryTimeline>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ?? getGetRuleHistoryTimelineQueryKey({ id }, params);

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof getRuleHistoryTimeline>>
	> = ({ signal }) => getRuleHistoryTimeline({ id }, params, signal);

	return {
		queryKey,
		queryFn,
		enabled: !!id,
		...queryOptions,
	} as UseQueryOptions<
		Awaited<ReturnType<typeof getRuleHistoryTimeline>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetRuleHistoryTimelineQueryResult = NonNullable<
	Awaited<ReturnType<typeof getRuleHistoryTimeline>>
>;
export type GetRuleHistoryTimelineQueryError =
	ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get rule history timeline
 */

export function useGetRuleHistoryTimeline<
	TData = Awaited<ReturnType<typeof getRuleHistoryTimeline>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ id }: GetRuleHistoryTimelinePathParameters,
	params: GetRuleHistoryTimelineParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getRuleHistoryTimeline>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetRuleHistoryTimelineQueryOptions(
		{ id },
		params,
		options,
	);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary Get rule history timeline
 */
export const invalidateGetRuleHistoryTimeline = async (
	queryClient: QueryClient,
	{ id }: GetRuleHistoryTimelinePathParameters,
	params: GetRuleHistoryTimelineParams,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetRuleHistoryTimelineQueryKey({ id }, params) },
		options,
	);

	return queryClient;
};

/**
 * Returns top label combinations contributing to rule firing in the selected time range.
 * @summary Get top contributors to rule firing
 */
export const getRuleHistoryTopContributors = (
	{ id }: GetRuleHistoryTopContributorsPathParameters,
	params: GetRuleHistoryTopContributorsParams,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<GetRuleHistoryTopContributors200>({
		url: `/api/v2/rules/${id}/history/top_contributors`,
		method: 'GET',
		params,
		signal,
	});
};

export const getGetRuleHistoryTopContributorsQueryKey = (
	{ id }: GetRuleHistoryTopContributorsPathParameters,
	params?: GetRuleHistoryTopContributorsParams,
) => {
	return [
		`/api/v2/rules/${id}/history/top_contributors`,
		...(params ? [params] : []),
	] as const;
};

export const getGetRuleHistoryTopContributorsQueryOptions = <
	TData = Awaited<ReturnType<typeof getRuleHistoryTopContributors>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ id }: GetRuleHistoryTopContributorsPathParameters,
	params: GetRuleHistoryTopContributorsParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getRuleHistoryTopContributors>>,
			TError,
			TData
		>;
	},
) => {
	const { query: queryOptions } = options ?? {};

	const queryKey =
		queryOptions?.queryKey ??
		getGetRuleHistoryTopContributorsQueryKey({ id }, params);

	const queryFn: QueryFunction<
		Awaited<ReturnType<typeof getRuleHistoryTopContributors>>
	> = ({ signal }) => getRuleHistoryTopContributors({ id }, params, signal);

	return {
		queryKey,
		queryFn,
		enabled: !!id,
		...queryOptions,
	} as UseQueryOptions<
		Awaited<ReturnType<typeof getRuleHistoryTopContributors>>,
		TError,
		TData
	> & { queryKey: QueryKey };
};

export type GetRuleHistoryTopContributorsQueryResult = NonNullable<
	Awaited<ReturnType<typeof getRuleHistoryTopContributors>>
>;
export type GetRuleHistoryTopContributorsQueryError =
	ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Get top contributors to rule firing
 */

export function useGetRuleHistoryTopContributors<
	TData = Awaited<ReturnType<typeof getRuleHistoryTopContributors>>,
	TError = ErrorType<RenderErrorResponseDTO>,
>(
	{ id }: GetRuleHistoryTopContributorsPathParameters,
	params: GetRuleHistoryTopContributorsParams,
	options?: {
		query?: UseQueryOptions<
			Awaited<ReturnType<typeof getRuleHistoryTopContributors>>,
			TError,
			TData
		>;
	},
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
	const queryOptions = getGetRuleHistoryTopContributorsQueryOptions(
		{ id },
		params,
		options,
	);

	const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & {
		queryKey: QueryKey;
	};

	query.queryKey = queryOptions.queryKey;

	return query;
}

/**
 * @summary Get top contributors to rule firing
 */
export const invalidateGetRuleHistoryTopContributors = async (
	queryClient: QueryClient,
	{ id }: GetRuleHistoryTopContributorsPathParameters,
	params: GetRuleHistoryTopContributorsParams,
	options?: InvalidateOptions,
): Promise<QueryClient> => {
	await queryClient.invalidateQueries(
		{ queryKey: getGetRuleHistoryTopContributorsQueryKey({ id }, params) },
		options,
	);

	return queryClient;
};

/**
 * This endpoint fires a test notification for the given rule definition
 * @summary Test alert rule
 */
export const testRule = (
	ruletypesPostableRuleDTO: BodyType<RuletypesPostableRuleDTO>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<TestRule200>({
		url: `/api/v2/rules/test`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: ruletypesPostableRuleDTO,
		signal,
	});
};

export const getTestRuleMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof testRule>>,
		TError,
		{ data: BodyType<RuletypesPostableRuleDTO> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof testRule>>,
	TError,
	{ data: BodyType<RuletypesPostableRuleDTO> },
	TContext
> => {
	const mutationKey = ['testRule'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof testRule>>,
		{ data: BodyType<RuletypesPostableRuleDTO> }
	> = (props) => {
		const { data } = props ?? {};

		return testRule(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type TestRuleMutationResult = NonNullable<
	Awaited<ReturnType<typeof testRule>>
>;
export type TestRuleMutationBody = BodyType<RuletypesPostableRuleDTO>;
export type TestRuleMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Test alert rule
 */
export const useTestRule = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof testRule>>,
		TError,
		{ data: BodyType<RuletypesPostableRuleDTO> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof testRule>>,
	TError,
	{ data: BodyType<RuletypesPostableRuleDTO> },
	TContext
> => {
	const mutationOptions = getTestRuleMutationOptions(options);

	return useMutation(mutationOptions);
};
