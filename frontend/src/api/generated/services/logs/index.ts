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

import type { HandleExportRawDataPOSTParams } from '../sigNoz.schemas/handleExportRawDataPOSTParams';

import type { Querybuildertypesv5QueryRangeRequestDTO } from '../sigNoz.schemas/querybuildertypesv5QueryRangeRequestDTO';

import type { RenderErrorResponseDTO } from '../sigNoz.schemas/renderErrorResponseDTO';

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

export const getHandleExportRawDataPOSTMutationKey = () =>
	['handleExportRawDataPOST'] as const;

export const getHandleExportRawDataPOSTMutationOptions = <
	TError = ErrorType<RenderErrorResponseDTO>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		Awaited<ReturnType<typeof handleExportRawDataPOST>>,
		TError,
		HandleExportRawDataPOSTMutationVariables,
		TContext
	>;
}): UseMutationOptions<
	Awaited<ReturnType<typeof handleExportRawDataPOST>>,
	TError,
	HandleExportRawDataPOSTMutationVariables,
	TContext
> => {
	const mutationKey = getHandleExportRawDataPOSTMutationKey();
	const { mutation: mutationOptions } = options
		? options.mutation &&
			'mutationKey' in options.mutation &&
			options.mutation.mutationKey
			? options
			: { ...options, mutation: { ...options.mutation, mutationKey } }
		: { mutation: { mutationKey } };

	const mutationFn: MutationFunction<
		Awaited<ReturnType<typeof handleExportRawDataPOST>>,
		HandleExportRawDataPOSTMutationVariables
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
export type HandleExportRawDataPOSTMutationVariables = {
	data?: BodyType<Querybuildertypesv5QueryRangeRequestDTO>;
	params?: HandleExportRawDataPOSTParams;
};

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
		HandleExportRawDataPOSTMutationVariables,
		TContext
	>;
}): UseMutationResult<
	Awaited<ReturnType<typeof handleExportRawDataPOST>>,
	TError,
	HandleExportRawDataPOSTMutationVariables,
	TContext
> => {
	return useMutation(getHandleExportRawDataPOSTMutationOptions(options));
};
