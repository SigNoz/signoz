import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import { GetPublicDashboardProps, PayloadProps,PublicDashboardProps } from 'types/api/dashboard/public/get';

const getPublicDashboard = async (props: GetPublicDashboardProps): Promise<SuccessResponseV2<PublicDashboardProps>> => {
	try {
		const response = await axios.get<PayloadProps>(`/dashboards/${props.id}/public`);
        
		return {
			httpStatusCode: response.status,
			data: response.data.data,
		};
	} catch (error) {
		ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	}
};

export default getPublicDashboard;
