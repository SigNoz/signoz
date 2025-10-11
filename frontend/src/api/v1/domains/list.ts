import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, RawSuccessResponse, SuccessResponseV2 } from 'types/api';
import { GettableAuthDomain } from 'types/api/v1/domains/list';

const listAllDomain = async (): Promise<
	SuccessResponseV2<GettableAuthDomain[]>
> => {
	try {
		const response = await axios.get<RawSuccessResponse<GettableAuthDomain[]>>(
			`/domains`,
		);

		return {
			httpStatusCode: response.status,
			data: response.data.data,
		};
	} catch (error) {
		ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	}
};

export default listAllDomain;
