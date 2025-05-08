import { ApiV2Instance as axios } from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import {
	OrganizationResponse,
	PayloadProps,
} from 'types/api/organizations/get';

const getMeOrg = async (): Promise<SuccessResponseV2<OrganizationResponse>> => {
	try {
		const response = await axios.get<PayloadProps>(`/orgs/me`);

		return {
			httpStatusCode: response.status,
			data: response.data.data,
		};
	} catch (error) {
		ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
		throw error;
	}
};

export default getMeOrg;
