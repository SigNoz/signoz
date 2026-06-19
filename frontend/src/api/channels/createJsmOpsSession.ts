import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import { JsmOpsOAuthSession } from 'types/api/channels/jsmOps';

interface Props {
	openerOrigin: string;
}

const createJsmOpsSession = async (
	props: Props,
): Promise<SuccessResponseV2<JsmOpsOAuthSession>> => {
	try {
		const response = await axios.post<{ data: JsmOpsOAuthSession }>(
			'/channels/jsmops/oauth/session',
			null,
			{ params: { opener_origin: props.openerOrigin } },
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

export default createJsmOpsSession;
