import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorResponseV2, ErrorV2Resp, SuccessResponseV2 } from 'types/api';

export interface UpdateRoutingPolicyBody {
	name: string;
	expression: string;
	channels: string[];
	description: string;
}

export interface UpdateRoutingPolicyResponse {
	success: boolean;
	message: string;
}

/**
 * @deprecated Use the generated `useUpdateRoutePolicy` hook (or `updateRoutePolicy` fetcher) from
 * `api/generated/services/routepolicies` instead. This hand-written client targets the
 * same endpoint and will be removed once call sites migrate.
 *
 * Part of https://github.com/SigNoz/engineering-pod/issues/5289, add a comment or update when removing this method.
 */
const updateRoutingPolicy = async (
	id: string,
	props: UpdateRoutingPolicyBody,
): Promise<
	SuccessResponseV2<UpdateRoutingPolicyResponse> | ErrorResponseV2
> => {
	try {
		const response = await axios.put(`/route_policies/${id}`, {
			...props,
		});

		return {
			httpStatusCode: response.status,
			data: response.data,
		};
	} catch (error) {
		return ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	}
};

export default updateRoutingPolicy;
