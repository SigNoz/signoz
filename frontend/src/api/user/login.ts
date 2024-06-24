import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import posthog from 'posthog-js';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { PayloadProps, Props } from 'types/api/user/login';

const login = async (
	props: Props,
): Promise<SuccessResponse<PayloadProps> | ErrorResponse> => {
	try {
		const response = await axios.post(`/login`, {
			...props,
		});

		posthog.identify(props.email, { email: props.email });
		// TODO: Extract emailDomain and make a groupId call
		// posthog.group('company', 'signoz.io', {
		// 	name: 'SigNoz',
		// 	subscription: "subscription",
		// 	date_joined: '2020-01-23'
		// });
		return {
			statusCode: 200,
			error: null,
			message: response.statusText,
			payload: response.data,
		};
	} catch (error) {
		return ErrorResponseHandler(error as AxiosError);
	}
};

export default login;
