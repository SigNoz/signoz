import { useCallback, useEffect, useState } from 'react';
import { ErrorResponse, SuccessResponse } from 'types/api';

function useFetch<PayloadProps, FunctionParams>(
	functions: {
		(props: FunctionParams): Promise<
			SuccessResponse<PayloadProps> | ErrorResponse
		>;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(arg0: any): Promise<SuccessResponse<PayloadProps> | ErrorResponse>;
	},
	param?: FunctionParams,
): State<PayloadProps | undefined> & { refetch: () => Promise<void> } {
	const [state, setStates] = useState<State<PayloadProps | undefined>>({
		loading: true,
		success: null,
		errorMessage: '',
		error: null,
		payload: undefined,
	});

	const fetchData = useCallback(async (): Promise<void> => {
		setStates((prev) => ({ ...prev, loading: true }));
		try {
			const response = await functions(param);

			if (response.statusCode === 200) {
				setStates({
					loading: false,
					error: false,
					success: true,
					payload: response.payload,
					errorMessage: '',
				});
			} else {
				setStates({
					loading: false,
					error: true,
					success: false,
					payload: undefined,
					errorMessage: response.error as string,
				});
			}
		} catch (error) {
			setStates({
				payload: undefined,
				loading: false,
				success: false,
				error: true,
				errorMessage: error as string,
			});
		}
	}, [functions, param]);

	// Initial fetch
	useEffect(() => {
		fetchData();
	}, [fetchData]);

	return {
		...state,
		refetch: fetchData,
	};
}

export interface State<T> {
	loading: boolean | null;
	error: boolean | null;
	success: boolean | null;
	payload?: T;
	errorMessage: string;
}

export default useFetch;
