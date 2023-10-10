import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';

interface IngestionInfo {
	keyId: string;
	name: string;
	createdAt: string;
	ingestionKey: string;
	ingestionURL: string;
	dataRegion: string;
}

interface IngestionResponseProps {
	payload: IngestionInfo[];
}

const getIngestionData = async (): Promise<
	SuccessResponse<IngestionResponseProps> | ErrorResponse
> => {
	try {
		const response = await axios.get(`/settings/ingestion_key`);

		return {
			statusCode: 200,
			error: null,
			message: 'Success',
			payload: response.data,
		};
	} catch (error) {
		return ErrorResponseHandler(error as AxiosError);
	}
};

export default getIngestionData;
