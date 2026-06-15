import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorResponseV2, ErrorV2Resp, SuccessResponseV2 } from 'types/api';

export interface DeleteRoutingPolicyResponse {
	success: boolean;
	message: string;
}

/**
 * @deprecated Use the generated `useDeleteRoutePolicyByID` hook (or `deleteRoutePolicyByID` fetcher) from
 * `api/generated/services/routepolicies` instead. This hand-written client targets the
 * same endpoint and will be removed once call sites migrate.
 *
 * Part of https://github.com/SigNoz/engineering-pod/issues/5289, add a comment or update when removing this method.
 */
const deleteRoutingPolicy = async (
	routingPolicyId: string,
): Promise<
	SuccessResponseV2<DeleteRoutingPolicyResponse> | ErrorResponseV2
> => {
	try {
		const response = await axios.delete(`/route_policies/${routingPolicyId}`);

		return {
			httpStatusCode: response.status,
			data: response.data,
		};
	} catch (error) {
		return ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	}
};

export default deleteRoutingPolicy;
