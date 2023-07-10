import { ServicesList } from 'types/api/metrics/getService';

export default interface MetricsTableProp {
	services: ServicesList[];
	loading: boolean;
	error: boolean;
}
