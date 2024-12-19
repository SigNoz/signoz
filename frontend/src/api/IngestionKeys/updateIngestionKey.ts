import { GatewayApiV1Instance } from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import {
	IngestionKeysPayloadProps,
	UpdateIngestionKeyProps,
} from 'types/api/ingestionKeys/types';

const updateIngestionKey = async (
	props: UpdateIngestionKeyProps,
): Promise<SuccessResponse<IngestionKeysPayloadProps> | ErrorResponse> => {
	try {
		const response = await GatewayApiV1Instance.patch(
			`/workspaces/me/keys/${props.id}`,
			{
				...props.data,
			},
		);

		return {
			statusCode: 200,
			error: null,
			message: response.data.status,
			payload: response.data.data,
		};
	} catch (error) {
		return ErrorResponseHandler(error as AxiosError);
	}
};

export default updateIngestionKey;
