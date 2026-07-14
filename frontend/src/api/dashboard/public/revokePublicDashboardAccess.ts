import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import { PayloadProps,RevokePublicDashboardAccessProps } from 'types/api/dashboard/public/delete';

/**
 * @deprecated Use the generated `useDeletePublicDashboard` hook (or `deletePublicDashboard` fetcher) from
 * `api/generated/services/dashboard` instead. This hand-written client targets the
 * same endpoint and will be removed once call sites migrate.
 *
 * Part of https://github.com/SigNoz/engineering-pod/issues/5289, add a comment or update when removing this method.
 */
const revokePublicDashboardAccess = async (
	props: RevokePublicDashboardAccessProps,
): Promise<SuccessResponseV2<PayloadProps>> => {
	try {
		const response = await axios.delete<PayloadProps>(`/dashboards/${props.id}/public`);

		return {
			httpStatusCode: response.status,
			data: response.data,
		};
	} catch (error) {
		ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	}
};

export default revokePublicDashboardAccess;
