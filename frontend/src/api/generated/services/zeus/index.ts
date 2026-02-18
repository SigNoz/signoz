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
	RenderErrorResponseDTO,
	ZeustypesPostableHostDTO,
	ZeustypesPostableProfileDTO,
} from '../sigNoz.schemas';

type AwaitedInput<T> = PromiseLike<T> | T;

type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;

/**
 * This endpoint saves the host of a deployment to zeus.
 * @summary Put host in Zeus for a deployment.
 */
export const putHostInZeus = (
	zeustypesPostableHostDTO: ZeustypesPostableHostDTO,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v2/zeus/hosts`,
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		data: zeustypesPostableHostDTO,
	});
};

export const getPutHostInZeusMutationOptions = <
	TError = RenderErrorResponseDTO,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof putHostInZeus>>,
		TError,
		{ data: ZeustypesPostableHostDTO },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof putHostInZeus>>,
	TError,
	{ data: ZeustypesPostableHostDTO },
	TContext
> => {
	const mutationKey = ['putHostInZeus'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
		  'mutationKey' in options.mutation &&
		  options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof putHostInZeus>>,
		{ data: ZeustypesPostableHostDTO }
	> = (props) => {
		const { data } = props ?? {};

		return putHostInZeus(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type PutHostInZeusMutationResult = NonNullable<
	Awaited<ReturnType<typeof putHostInZeus>>
>;
export type PutHostInZeusMutationBody = ZeustypesPostableHostDTO;
export type PutHostInZeusMutationError = RenderErrorResponseDTO;

/**
 * @summary Put host in Zeus for a deployment.
 */
export const usePutHostInZeus = <
	TError = RenderErrorResponseDTO,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof putHostInZeus>>,
		TError,
		{ data: ZeustypesPostableHostDTO },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof putHostInZeus>>,
	TError,
	{ data: ZeustypesPostableHostDTO },
	TContext
> => {
	const mutationOptions = getPutHostInZeusMutationOptions(options);

	return useMutation(mutationOptions);
};
/**
 * This endpoint saves the profile of a deployment to zeus.
 * @summary Put profile in Zeus for a deployment.
 */
export const putProfileInZeus = (
	zeustypesPostableProfileDTO: ZeustypesPostableProfileDTO,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v2/zeus/profiles`,
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		data: zeustypesPostableProfileDTO,
	});
};

export const getPutProfileInZeusMutationOptions = <
	TError = RenderErrorResponseDTO,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof putProfileInZeus>>,
		TError,
		{ data: ZeustypesPostableProfileDTO },
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof putProfileInZeus>>,
	TError,
	{ data: ZeustypesPostableProfileDTO },
	TContext
> => {
	const mutationKey = ['putProfileInZeus'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
		  'mutationKey' in options.mutation &&
		  options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof putProfileInZeus>>,
		{ data: ZeustypesPostableProfileDTO }
	> = (props) => {
		const { data } = props ?? {};

		return putProfileInZeus(data);
	};

	return { mutationFn, ...mutationOptions };
};

export type PutProfileInZeusMutationResult = NonNullable<
	Awaited<ReturnType<typeof putProfileInZeus>>
>;
export type PutProfileInZeusMutationBody = ZeustypesPostableProfileDTO;
export type PutProfileInZeusMutationError = RenderErrorResponseDTO;

/**
 * @summary Put profile in Zeus for a deployment.
 */
export const usePutProfileInZeus = <
	TError = RenderErrorResponseDTO,
	TContext = unknown
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof putProfileInZeus>>,
		TError,
		{ data: ZeustypesPostableProfileDTO },
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof putProfileInZeus>>,
	TError,
	{ data: ZeustypesPostableProfileDTO },
	TContext
> => {
	const mutationOptions = getPutProfileInZeusMutationOptions(options);

	return useMutation(mutationOptions);
};
