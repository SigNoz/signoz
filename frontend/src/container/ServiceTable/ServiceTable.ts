import { ServicesList } from 'types/api/metrics/getService';

export default interface ServiceTableProp {
	services: ServicesList[];
	loading: boolean;
	error: boolean;
}
