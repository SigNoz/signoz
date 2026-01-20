import { GatewayApiV2Instance } from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import {
	CreatedIngestionKeyProps,
	UpdateIngestionKeyProps,
} from 'types/api/ingestionKeys/types';

const updateIngestionKey = async (
	props: UpdateIngestionKeyProps,
): Promise<SuccessResponse<CreatedIngestionKeyProps> | ErrorResponse> => {
	try {
		const response = await GatewayApiV2Instance.patch(
			`/ingestion_keys/${props.id}`,
			{
				...props.data,
			},
		);

		return {
			statusCode: 200,
			error: null,
			message: 'success',
			payload: response.data,
		};
	} catch (error) {
		return ErrorResponseHandler(error as AxiosError);
	}
};

export default updateIngestionKey;
