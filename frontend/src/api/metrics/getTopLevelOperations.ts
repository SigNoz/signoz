import axios from 'api';
import { ServiceDataProps } from 'container/MetricsApplication/Tabs/Overview';

const getTopLevelOperations = async (): Promise<ServiceDataProps> => {
	const response = await axios.post(`/service/top_level_operations`);
	return response.data;
};

export default getTopLevelOperations;
