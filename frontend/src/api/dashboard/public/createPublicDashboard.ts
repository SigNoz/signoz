import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, 	 SuccessResponseV2 } from 'types/api';
import { CreatePublicDashboardProps } from 'types/api/dashboard/public/create';

const createPublicDashboard = async (
	props: CreatePublicDashboardProps,
): Promise<SuccessResponseV2<CreatePublicDashboardProps>> => {

    const { dashboardId, timeRangeEnabled = false, defaultTimeRange = '30m' } = props;

	try {
		const response = await axios.post(
			`/dashboards/${dashboardId}/public`,
			{ timeRangeEnabled, defaultTimeRange },
		);

		return {
			httpStatusCode: response.status,
			data: response.data.data,
		};
	} catch (error) {
		ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	}
};

export default createPublicDashboard;
