import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import { Props } from 'types/api/user/editUser';

const update = async (props: Props): Promise<SuccessResponseV2<null>> => {
	try {
		const response = await axios.put(`/user/${props.userId}`, {
			displayName: props.displayName,
			role: props.role,
		});

		return {
			httpStatusCode: response.status,
			data: null,
		};
	} catch (error) {
		ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	}
};

export default update;
