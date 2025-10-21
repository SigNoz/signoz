import axios from 'api';
import { PayloadProps, Props } from 'types/api/metrics/getService';

const getService = async (props: Props): Promise<PayloadProps> => {
	const response = await axios.post(`/services`, {
		start: `${props.start}`,
		end: `${props.end}`,
		tags: props.selectedTags,
	});
	// Backend serves /api/v1/services but returns v5-style { status, data }
	return response.data?.data ?? response.data;
};

export default getService;
