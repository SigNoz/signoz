import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import { PayloadProps, Props } from 'types/api/channels/delete';

/**
 * @deprecated Use the generated `useDeleteChannelByID` hook (or `deleteChannelByID` fetcher) from
 * `api/generated/services/channels` instead. This hand-written client targets the
 * same endpoint and will be removed once call sites migrate.
 *
 * Part of https://github.com/SigNoz/engineering-pod/issues/5289, add a comment or update when removing this method.
 */
const deleteChannel = async (
	props: Props,
): Promise<SuccessResponseV2<PayloadProps>> => {
	try {
		const response = await axios.delete<PayloadProps>(`/channels/${props.id}`);

		return {
			httpStatusCode: response.status,
			data: response.data,
		};
	} catch (error) {
		ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
		throw error;
	}
};

export default deleteChannel;
