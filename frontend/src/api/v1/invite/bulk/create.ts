import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import { UsersProps } from 'types/api/user/inviteUsers';

const inviteUsers = async (
	users: UsersProps,
): Promise<SuccessResponseV2<null>> => {
	try {
		const response = await axios.post(`/invite/bulk`, users);
		return {
			httpStatusCode: response.status,
			data: null,
		};
	} catch (error) {
		ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	}
};

export default inviteUsers;
