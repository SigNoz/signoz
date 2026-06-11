import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import { UsersProps } from 'types/api/user/inviteUsers';

/**
 * @deprecated Use the generated `useCreateBulkInvite` hook (or `createBulkInvite` fetcher) from
 * `api/generated/services/users` instead. This hand-written client targets the
 * same endpoint and will be removed once call sites migrate.
 *
 * Part of https://github.com/SigNoz/engineering-pod/issues/5289, add a comment or update when removing this method.
 */
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
