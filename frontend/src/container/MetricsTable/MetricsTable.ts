import { ServicesList } from 'types/api/metrics/getService';

export default interface MatricsTableProp {
	services: ServicesList[];
	loading: boolean;
	error: boolean;
}
