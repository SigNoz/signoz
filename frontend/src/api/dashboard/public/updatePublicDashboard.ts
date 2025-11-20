import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import {  ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import { UpdatePublicDashboardProps } from 'types/api/dashboard/public/update';

const updatePublicDashboard = async (
	props: UpdatePublicDashboardProps,
): Promise<SuccessResponseV2<UpdatePublicDashboardProps>> => {

    const { dashboardId, timeRangeEnabled = false, defaultTimeRange = '30m' } = props;

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
