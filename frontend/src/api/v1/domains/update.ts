import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import { AuthDomain } from 'types/api/SAML/listDomain';
import { PayloadProps, Props } from 'types/api/SAML/updateDomain';

const updateDomain = async (
	props: Props,
): Promise<SuccessResponseV2<AuthDomain>> => {
	try {
		const response = await axios.put<PayloadProps>(`/domains/${props.id}`, props);

		return {
			httpStatusCode: response.status,
			data: response.data.data,
		};
	} catch (error) {
		ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	}
};

export default updateDomain;
