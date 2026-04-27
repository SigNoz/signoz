/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'yarn generate:api'
 * SigNoz
 */
import { useMutation } from 'react-query';
import type {
	MutationFunction,
	UseMutationOptions,
	UseMutationResult,
} from 'react-query';

import type {
	AuthzCheck200,
	CoretypesTransactionDTO,
	RenderErrorResponseDTO,
} from '../sigNoz.schemas';

import { GeneratedAPIInstance } from '../../../generatedAPIInstance';
import type { ErrorType, BodyType } from '../../../generatedAPIInstance';

/**
 * Checks if the authenticated user has permissions for given transactions
 * @summary Check permissions
 */
export const authzCheck = (
	coretypesTransactionDTO: BodyType<CoretypesTransactionDTO[]>,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<AuthzCheck200>({
		url: `/api/v1/authz/check`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: coretypesTransactionDTO,
		signal,
	});
};

export const getAuthzCheckMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof authzCheck>>,
		TError,
		{ data: BodyType<CoretypesTransactionDTO[]> },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof authzCheck>>,
	TError,
	{ data: BodyType<CoretypesTransactionDTO[]> },
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
		{ data: BodyType<CoretypesTransactionDTO[]> }
	> = (props) => {
		const { data } = props ?? {};

		return authzCheck(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type AuthzCheckMutationResult = NonNullable<
	Awaited<ReturnType<typeof authzCheck>>
>;
export type AuthzCheckMutationBody = BodyType<CoretypesTransactionDTO[]>;
export type AuthzCheckMutationError = ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Check permissions
 */
export const useAuthzCheck = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof authzCheck>>,
		TError,
		{ data: BodyType<CoretypesTransactionDTO[]> },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof authzCheck>>,
	TError,
	{ data: BodyType<CoretypesTransactionDTO[]> },
	TContext
> => {
	const mutationOptions = getAuthzCheckMutationOptions(options);

	return useMutation(mutationOptions);
};
