import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { MetricRangePayloadV5 } from 'api/v5/v5';
import { AxiosError } from 'axios';
import { ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import { GetPublicDashboardWidgetDataProps } from 'types/api/dashboard/public/getWidgetData';


const getPublicDashboardWidgetData = async (props: GetPublicDashboardWidgetDataProps): Promise<SuccessResponseV2<MetricRangePayloadV5>> => {
	try {
		const response = await axios.get(`/public/dashboards/${props.id}/widgets/${props.index}/query_range`, {
			params: {
				startTime: props.startTime,
				endTime: props.endTime,
			},
		});
        
		return {
			httpStatusCode: response.status,
			data: response.data,
		};
	} catch (error) {
		ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	}
};

export default getPublicDashboardWidgetData;
