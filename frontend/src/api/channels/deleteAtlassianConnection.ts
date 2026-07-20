import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, SuccessResponseV2 } from 'types/api';

interface Props {
	id: string;
}

const deleteAtlassianConnection = async (
	props: Props,
): Promise<SuccessResponseV2<null>> => {
	try {
		const response = await axios.delete(
			`/channels/atlassian/connections/${props.id}`,
		);

		return {
			httpStatusCode: response.status,
			data: null,
		};
	} catch (error) {
		return ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	}
};

export default deleteAtlassianConnection;
