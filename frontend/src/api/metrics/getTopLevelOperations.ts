import axios from 'api';

interface GetTopLevelOperationsProps {
	service: string;
	start: number;
	end: number;
}

const getTopLevelOperations = async (
	props: GetTopLevelOperationsProps,
): Promise<ServiceDataProps> => {
	const response = await axios.post(`/service/top_level_operations`, {
		start: `${props.start}`,
		end: `${props.end}`,
		service: props.service,
	});
	return response.data;
};

export type ServiceDataProps = {
	[serviceName: string]: string[];
};

export default getTopLevelOperations;
