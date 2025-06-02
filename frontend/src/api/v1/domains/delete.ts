import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import { PayloadProps, Props } from 'types/api/SAML/deleteDomain';

const deleteDomain = async (props: Props): Promise<SuccessResponseV2<null>> => {
	try {
		const response = await axios.delete<PayloadProps>(`/domains/${props.id}`);

		return {
			httpStatusCode: response.status,
			data: null,
		};
	} catch (error) {
		ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	}
};

export default deleteDomain;
