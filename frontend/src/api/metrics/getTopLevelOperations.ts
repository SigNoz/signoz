import axios from 'api';
import { isNil } from 'lodash-es';

interface GetTopLevelOperationsProps {
	service?: string;
	start?: number;
	end?: number;
}

const getTopLevelOperations = async (
	props: GetTopLevelOperationsProps,
): Promise<ServiceDataProps> => {
	const response = await axios.post(`/service/top_level_operations`, {
		start: !isNil(props.start) ? `${props.start}` : undefined,
		end: !isNil(props.end) ? `${props.end}` : undefined,
		service: props.service,
	});
	return response.data;
};

export type ServiceDataProps = {
	[serviceName: string]: string[];
};

export default getTopLevelOperations;
