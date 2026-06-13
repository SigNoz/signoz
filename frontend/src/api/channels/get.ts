import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import { PayloadProps, Props } from 'types/api/channels/get';
import { Channels } from 'types/api/channels/getAll';

/**
 * @deprecated Use the generated `useGetChannelByID` hook (or `getChannelByID` fetcher) from
 * `api/generated/services/channels` instead. This hand-written client targets the
 * same endpoint and will be removed once call sites migrate.
 *
 * Part of https://github.com/SigNoz/engineering-pod/issues/5289, add a comment or update when removing this method.
 */
const get = async (props: Props): Promise<SuccessResponseV2<Channels>> => {
	try {
		const response = await axios.get<PayloadProps>(`/channels/${props.id}`);

		return {
			httpStatusCode: response.status,
			data: response.data.data,
		};
	} catch (error) {
		ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
		throw error;
	}
};

export default get;
