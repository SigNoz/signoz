import axios from 'api';
import { PayloadProps, Props } from 'types/api/metrics/getService';

const getService = async (props: Props): Promise<PayloadProps> => {
	const response = await axios.post(`/services`, {
		start: `${props.start}`,
		end: `${props.end}`,
		tags: props.selectedTags,
	});
	return response.data;
};

export default getService;
