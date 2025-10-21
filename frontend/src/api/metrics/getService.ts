import { ApiV2Instance } from 'api';
import { PayloadProps, Props } from 'types/api/metrics/getService';

const getService = async (props: Props): Promise<PayloadProps> => {
	const response = await ApiV2Instance.post(`/services`, {
		start: `${props.start}`,
		end: `${props.end}`,
		tags: props.selectedTags,
	});
	// Backend serves v5-style { status, data }
	return response.data?.data ?? response.data;
};

export default getService;
