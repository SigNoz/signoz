import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import { GetPublicDashboardDataProps, PayloadProps,PublicDashboardDataProps } from 'types/api/dashboard/public/get';

/**
 * @deprecated Use the generated `useGetPublicDashboardData` hook (or `getPublicDashboardData` fetcher) from
 * `api/generated/services/dashboard` instead. This hand-written client targets the
 * same endpoint and will be removed once call sites migrate.
 *
 * Part of https://github.com/SigNoz/engineering-pod/issues/5289, add a comment or update when removing this method.
 */
const getPublicDashboardData = async (props: GetPublicDashboardDataProps): Promise<SuccessResponseV2<PublicDashboardDataProps>> => {
	try {
		const response = await axios.get<PayloadProps>(`/public/dashboards/${props.id}`);
        
		return {
			httpStatusCode: response.status,
			data: response.data.data,
		};
	} catch (error) {
		ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	}
};

export default getPublicDashboardData;
