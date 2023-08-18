import axios from 'api';
import { PayloadProps, Props } from 'types/api/metrics/getTopOperations';

const getTopOperations = async (props: Props): Promise<PayloadProps> => {
	const response = await axios.post(`/service/top_operations`, {
		start: `${props.start}`,
		end: `${props.end}`,
		service: props.service,
		tags: props.selectedTags,
	});

	return response.data;
};

export default getTopOperations;
