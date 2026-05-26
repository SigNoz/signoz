import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { DEFAULT_TIME_RANGE } from 'container/TopNav/DateTimeSelectionV2/constants';
import { ErrorV2Resp, 	 SuccessResponseV2 } from 'types/api';
import { CreatePublicDashboardProps } from 'types/api/dashboard/public/create';

const createPublicDashboard = async (
	props: CreatePublicDashboardProps,
): Promise<SuccessResponseV2<CreatePublicDashboardProps>> => {

    const { dashboardId, timeRangeEnabled = false, defaultTimeRange = DEFAULT_TIME_RANGE } = props;

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
