import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { CreatePublicDashboardProps } from 'types/api/dashboard/public/create';

const createPublicDashboard = async (
	props: CreatePublicDashboardProps,
): Promise<SuccessResponse<CreatePublicDashboardProps> | ErrorResponse> => {

    const { dashboardId, timeRangeEnabled, defaultTimeRange } = props;

    if (!dashboardId || !timeRangeEnabled || !defaultTimeRange) {
      return {
        statusCode: 400,
        error: 'Invalid request',
        message: 'Dashboard ID, time range enabled, and default time range are required',
        payload: null,
      } as ErrorResponse;
    }

    const payload = {
      timeRangeEnabled,
      defaultTimeRange,
    }

	try {
		const response = await axios.post(
			`/dashboards/${dashboardId}/public`,
			payload,
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

export default createPublicDashboard;
