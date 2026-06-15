import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { MetricRangePayloadV5 } from 'api/v5/v5';
import { AxiosError } from 'axios';
import { ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import { GetPublicDashboardWidgetDataProps } from 'types/api/dashboard/public/getWidgetData';


/**
 * @deprecated Use the generated `useGetPublicDashboardWidgetQueryRange` hook (or `getPublicDashboardWidgetQueryRange` fetcher) from
 * `api/generated/services/dashboard` instead. This hand-written client targets the
 * same endpoint and will be removed once call sites migrate.
 *
 * Part of https://github.com/SigNoz/engineering-pod/issues/5289, add a comment or update when removing this method.
 */
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
