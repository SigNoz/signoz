import { ServicesList } from 'types/api/metrics/getService';

export default interface ServiceTableProp {
	services: ServicesList[];
	isLoading: boolean;
}
