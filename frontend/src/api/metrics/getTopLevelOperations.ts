import axios from 'api';
import { PayloadProps, Props } from 'types/api/metrics/getTopLevelOperations';

const getTopLevelOperations = async (props: Props): Promise<PayloadProps> => {
	const response = await axios.post(`/service/top_level_operations`);
	return response.data[props.service];
};

export default getTopLevelOperations;
