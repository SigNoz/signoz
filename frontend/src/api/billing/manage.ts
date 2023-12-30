import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import {
	CheckoutRequestPayloadProps,
	CheckoutSuccessPayloadProps,
} from 'types/api/billing/checkout';

const manageCreditCardApi = async (
	props: CheckoutRequestPayloadProps,
): Promise<SuccessResponse<CheckoutSuccessPayloadProps> | ErrorResponse> => {
	try {
		const response = await axios.post('/portal', {
			licenseKey: props.licenseKey,
			returnURL: props.successURL,
		});

		return {
			statusCode: 200,
			error: null,
			message: response.data.status,
			payload: response.data.data,
		};
	} catch (error) {
		return ErrorResponseHandler(error as AxiosError);
	}
};

export default manageCreditCardApi;
