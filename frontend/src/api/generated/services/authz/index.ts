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

import type { AuthtypesTransactionDTO } from '../sigNoz.schemas/authtypesTransactionDTO';

import type { AuthzCheck200 } from '../sigNoz.schemas/authzCheck200';

import type { RenderErrorResponseDTO } from '../sigNoz.schemas/renderErrorResponseDTO';

import { GeneratedAPIInstance } from '../../../generatedAPIInstance';
import type { ErrorType, BodyType } from '../../../generatedAPIInstance';

/**
 * Checks if the authenticated user has permissions for given transactions
 * @summary Check permissions
 */
export const authzCheck = (
	authtypesTransactionDTO?: BodyType<AuthtypesTransactionDTO[]>,
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

export const getAuthzCheckMutationKey = () => ['authzCheck'] as const;

export const getAuthzCheckMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof authzCheck>>,
		TError,
		AuthzCheckMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof authzCheck>>,
	TError,
	AuthzCheckMutationVariables,
	TContext
> => {
	const mutationKey = getAuthzCheckMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof authzCheck>>,
		AuthzCheckMutationVariables
	> = (props) => {
		const { data } = props ?? {};

		return authzCheck(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type AuthzCheckMutationResult = NonNullable<
	Awaited<ReturnType<typeof authzCheck>>
>;
export type AuthzCheckMutationBody =
	| BodyType<AuthtypesTransactionDTO[]>
	| undefined;
export type AuthzCheckMutationError = ErrorType<RenderErrorResponseDTO>;
export type AuthzCheckMutationVariables = {
	data?: BodyType<AuthtypesTransactionDTO[]>;
};

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
		AuthzCheckMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof authzCheck>>,
	TError,
	AuthzCheckMutationVariables,
	TContext
> => {
	return useMutation(getAuthzCheckMutationOptions(options));
};
