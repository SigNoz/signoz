import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import { GetPublicDashboardMetaProps, PayloadProps,PublicDashboardMetaProps } from 'types/api/dashboard/public/getMeta';

const getPublicDashboardMeta = async (props: GetPublicDashboardMetaProps): Promise<SuccessResponseV2<PublicDashboardMetaProps>> => {
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

export default getPublicDashboardMeta;
