import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import { JsmOpsTeam } from 'types/api/channels/jsmOps';

interface Props {
	connectionId?: string;
	channelId?: string;
}

const getJsmOpsTeams = async (
	props: Props,
): Promise<SuccessResponseV2<JsmOpsTeam[]>> => {
	try {
		const response = await axios.get<{ data: JsmOpsTeam[] }>(
			'/channels/jsmops/teams',
			{
				params: {
					connection_id: props.connectionId,
					channel_id: props.channelId,
				},
			},
		);

		return {
			httpStatusCode: response.status,
			data: response.data.data,
		};
	} catch (error) {
		return ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	}
};

export default getJsmOpsTeams;
