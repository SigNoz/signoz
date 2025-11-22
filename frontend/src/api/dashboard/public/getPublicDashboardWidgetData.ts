import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import { GetPublicDashboardWidgetDataProps, PayloadProps, PublicDashboardWidgetDataProps } from 'types/api/dashboard/public/getWidgetData';


const getPublicDashboardWidgetData = async (props: GetPublicDashboardWidgetDataProps): Promise<SuccessResponseV2<PublicDashboardWidgetDataProps>> => {
	try {
		const response = await axios.get<PayloadProps>(`/public/dashboards/${props.id}/widgets/${props.index}/query_range`, {
			params: {
				startTime: props.startTime,
				endTime: props.endTime,
			},
		});
        
		return {
			httpStatusCode: response.status,
			data: response.data.data,
		};
	} catch (error) {
		ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	}
};

export default getPublicDashboardWidgetData;
