import axios from 'api';
import { PayloadProps, Props } from 'types/api/metrics/getServiceOverview';

const getServiceOverview = async (props: Props): Promise<PayloadProps> => {
	const response = await axios.post(`/service/overview`, {
		start: `${props.start}`,
		end: `${props.end}`,
		service: props.service,
		step: props.step,
		tags: props.selectedTags,
	});

	return response.data;
};

export default getServiceOverview;
