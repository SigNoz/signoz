import axios from 'api';
import { ServiceDataProps } from 'types/api/metrics/getTopLevelOperations';

const getTopLevelOperations = async (): Promise<ServiceDataProps> => {
	const response = await axios.post(`/service/top_level_operations`);
	return response.data;
};

export default getTopLevelOperations;
