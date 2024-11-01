import axios from 'api';
import { SuccessResponse } from 'types/api';
import { InviteUsersResponse, UsersProps } from 'types/api/user/inviteUsers';

const inviteUsers = async (
	users: UsersProps,
): Promise<SuccessResponse<InviteUsersResponse>> => {
	const response = await axios.post(`/invite/bulk`, users);

	return {
		statusCode: 200,
		error: null,
		message: response.data.status,
		payload: response.data,
	};
};

export default inviteUsers;
