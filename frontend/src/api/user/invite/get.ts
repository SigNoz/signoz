import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import {
	InviteResponse,
	PayloadProps,
	Props,
} from 'types/api/user/invite/getInviteDetails';

const getInviteDetails = async (
	props: Props,
): Promise<SuccessResponseV2<InviteResponse>> => {
	try {
		const response = await axios.get<PayloadProps>(
			`/invite/${props.inviteId}?ref=${window.location.href}`,
		);

		return {
			httpStatusCode: response.status,
			data: response.data.data,
		};
	} catch (error) {
		ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
		throw error;
	}
};

export default getInviteDetails;
