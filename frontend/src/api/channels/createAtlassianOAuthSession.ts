import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import { AtlassianOAuthSession } from 'types/api/channels/atlassian';

interface Props {
	openerOrigin: string;
}

const createAtlassianOAuthSession = async (
	props: Props,
): Promise<SuccessResponseV2<AtlassianOAuthSession>> => {
	try {
		const response = await axios.post<{ data: AtlassianOAuthSession }>(
			'/channels/atlassian/oauth/session',
			null,
			{ params: { opener_origin: props.openerOrigin } },
		);

		return {
			httpStatusCode: response.status,
			data: response.data.data,
		};
	} catch (error) {
		return ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	}
};

export default createAtlassianOAuthSession;
