import { ServicesList } from 'types/actions/metrics';

interface MetricReducer {
	services: ServicesList[];
	loading: boolean;
	error: boolean;
	errorMessage: string;
}

export default MetricReducer;
