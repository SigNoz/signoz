import axios from 'api';
import { PayloadProps, Props } from 'types/api/metrics/getTopOperations';

const getTopOperations = async (props: Props): Promise<PayloadProps> => {
	const endpoint = props.isEntryPoint
		? '/service/entry_point_operations'
		: '/service/top_operations';

	const response = await axios.post(endpoint, {
		start: `${props.start}`,
		end: `${props.end}`,
		service: props.service,
		tags: props.selectedTags,
	});

	if (props.isEntryPoint) {
		return response.data.data;
	}
	return response.data;
};

export default getTopOperations;
