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

import { GeneratedAPIInstance } from '../../../index';
import type {
	AuthtypesTransactionDTO,
	AuthzCheck200,
	RenderErrorResponseDTO,
} from '../sigNoz.schemas';

type AwaitedInput<T> = PromiseLike<T> | T;

type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;

/**
 * Checks if the authenticated user has permissions for given transactions
 * @summary Check permissions
 */
export const authzCheck = (
	authtypesTransactionDTO: AuthtypesTransactionDTO[],
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<AuthzCheck200>({
		url: `/api/v1/authz/check`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: authtypesTransactionDTO,
		signal,
	});
};

export const getAuthzCheckMutationOptions = <
	TError = RenderErrorResponseDTO,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof authzCheck>>,
		TError,
		{ data: AuthtypesTransactionDTO[] },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof authzCheck>>,
	TError,
	{ data: AuthtypesTransactionDTO[] },
	TContext
> => {
	const mutationKey = ['authzCheck'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
		  'mutationKey' in options.mutation &&
		  options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof authzCheck>>,
		{ data: AuthtypesTransactionDTO[] }
	> = (props) => {
		const { data } = props ?? {};

		return authzCheck(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type AuthzCheckMutationResult = NonNullable<
	Awaited<ReturnType<typeof authzCheck>>
>;
export type AuthzCheckMutationBody = AuthtypesTransactionDTO[];
export type AuthzCheckMutationError = RenderErrorResponseDTO;

/**
 * @summary Check permissions
 */
export const useAuthzCheck = <
	TError = RenderErrorResponseDTO,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof authzCheck>>,
		TError,
		{ data: AuthtypesTransactionDTO[] },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof authzCheck>>,
	TError,
	{ data: AuthtypesTransactionDTO[] },
	TContext
> => {
	const mutationOptions = getAuthzCheckMutationOptions(options);

	return useMutation(mutationOptions);
};
