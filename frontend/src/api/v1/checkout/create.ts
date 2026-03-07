import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import {
	CheckoutRequestPayloadProps,
	CheckoutSuccessPayloadProps,
	PayloadProps,
} from 'types/api/billing/checkout';

const updateCreditCardApi = async (
	props: CheckoutRequestPayloadProps,
): Promise<SuccessResponseV2<CheckoutSuccessPayloadProps>> => {
	try {
		const response = await axios.post<PayloadProps>('/checkout', {
			url: props.url,
		});

		return {
			httpStatusCode: response.status,
			data: response.data.data,
		};
	} catch (error) {
		ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	}
};

export default updateCreditCardApi;
