import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import { AuthDomain, PayloadProps } from 'types/api/SAML/listDomain';

const listAllDomain = async (): Promise<SuccessResponseV2<AuthDomain[]>> => {
	try {
		const response = await axios.get<PayloadProps>(`/domains`);

		return {
			httpStatusCode: response.status,
			data: response.data.data,
		};
	} catch (error) {
		ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	}
};

export default listAllDomain;
