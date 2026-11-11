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
	HandleExportRawDataPOSTParams,
	Querybuildertypesv5QueryRangeRequestDTO,
	RenderErrorResponseDTO,
} from '../sigNoz.schemas';

import { GeneratedAPIInstance } from '../../../generatedAPIInstance';
import type { ErrorType, BodyType } from '../../../generatedAPIInstance';

/**
 * This endpoints allows complex query exporting raw data for traces and logs
 * @summary Export raw data
 */
export const handleExportRawDataPOST = (
	querybuildertypesv5QueryRangeRequestDTO?: BodyType<Querybuildertypesv5QueryRangeRequestDTO>,
	params?: HandleExportRawDataPOSTParams,
	signal?: AbortSignal,
) => {
	return GeneratedAPIInstance<void>({
		url: `/api/v1/export_raw_data`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: querybuildertypesv5QueryRangeRequestDTO,
		params,
		signal,
	});
};

export const getHandleExportRawDataPOSTMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof handleExportRawDataPOST>>,
		TError,
		{
			data?: BodyType<Querybuildertypesv5QueryRangeRequestDTO>;
			params?: HandleExportRawDataPOSTParams;
		},
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof handleExportRawDataPOST>>,
	TError,
	{
		data?: BodyType<Querybuildertypesv5QueryRangeRequestDTO>;
		params?: HandleExportRawDataPOSTParams;
	},
	TContext
> => {
	const mutationKey = ['handleExportRawDataPOST'];
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof handleExportRawDataPOST>>,
		{
			data?: BodyType<Querybuildertypesv5QueryRangeRequestDTO>;
			params?: HandleExportRawDataPOSTParams;
		}
	> = (props) => {
		const { data, params } = props ?? {};

		return handleExportRawDataPOST(data, params);
	};

	return { mutationFn, ...mutationOptions };
};

export type HandleExportRawDataPOSTMutationResult = NonNullable<
	Awaited<ReturnType<typeof handleExportRawDataPOST>>
>;
export type HandleExportRawDataPOSTMutationBody =
	| BodyType<Querybuildertypesv5QueryRangeRequestDTO>
	| undefined;
export type HandleExportRawDataPOSTMutationError =
	ErrorType<RenderErrorResponseDTO>;

/**
 * @summary Export raw data
 */
export const useHandleExportRawDataPOST = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof handleExportRawDataPOST>>,
		TError,
		{
			data?: BodyType<Querybuildertypesv5QueryRangeRequestDTO>;
			params?: HandleExportRawDataPOSTParams;
		},
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof handleExportRawDataPOST>>,
	TError,
	{
		data?: BodyType<Querybuildertypesv5QueryRangeRequestDTO>;
		params?: HandleExportRawDataPOSTParams;
	},
	TContext
> => {
	return useMutation(getHandleExportRawDataPOSTMutationOptions(options));
};
