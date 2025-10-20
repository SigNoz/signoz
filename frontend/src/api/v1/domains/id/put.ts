import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, RawSuccessResponse, SuccessResponseV2 } from 'types/api';
import { UpdatableAuthDomain } from 'types/api/v1/domains/put';

const put = async (
	props: UpdatableAuthDomain,
): Promise<SuccessResponseV2<null>> => {
	try {
		const response = await axios.put<RawSuccessResponse<null>>(
			`/domains/${props.id}`,
			{ config: props.config },
		);

		return {
			httpStatusCode: response.status,
			data: response.data.data,
		};
	} catch (error) {
		ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	}
};

export default put;
