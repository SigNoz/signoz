import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import { UpdateAPIKeyProps } from 'types/api/pat/types';

const updateAPIKey = async (
	props: UpdateAPIKeyProps,
): Promise<SuccessResponseV2<null>> => {
	try {
		const response = await axios.put(`/pats/${props.id}`, {
			...props.data,
		});

		return {
			httpStatusCode: response.status,
			data: null,
		};
	} catch (error) {
		ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	}
};

export default updateAPIKey;
