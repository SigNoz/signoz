import axios from 'api';

const getTopLevelOperations = async (): Promise<ServiceDataProps> => {
	const response = await axios.post(`/service/top_level_operations`);
	return response.data;
};

export type ServiceDataProps = {
	[serviceName: string]: string[];
};

export default getTopLevelOperations;
