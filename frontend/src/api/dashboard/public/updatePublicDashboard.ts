import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { DEFAULT_TIME_RANGE } from 'container/TopNav/DateTimeSelectionV2/constants';
import {  ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import { UpdatePublicDashboardProps } from 'types/api/dashboard/public/update';

const updatePublicDashboard = async (
	props: UpdatePublicDashboardProps,
): Promise<SuccessResponseV2<UpdatePublicDashboardProps>> => {

    const { dashboardId, timeRangeEnabled = false, defaultTimeRange = DEFAULT_TIME_RANGE } = props;

	try {
		const response = await axios.put(
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

export default updatePublicDashboard;
