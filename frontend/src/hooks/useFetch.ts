import { useEffect, useRef, useState } from 'react';
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
): State<PayloadProps | undefined> {
	const [state, setStates] = useState<State<PayloadProps | undefined>>({
		loading: true,
		success: null,
		errorMessage: '',
		error: null,
		payload: undefined,
	});

	const loadingRef = useRef(0);

	useEffect(() => {
		try {
			(async (): Promise<void> => {
				if (state.loading) {
					const response = await functions(param);

					if (loadingRef.current === 0) {
						loadingRef.current = 1;

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
					}
				}
			})();
		} catch (error) {
			setStates({
				payload: undefined,
				loading: false,
				success: false,
				error: true,
				errorMessage: error as string,
			});
		}
		return (): void => {
			loadingRef.current = 1;
		};
	}, [functions, param, state.loading]);

	return {
		...state,
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
