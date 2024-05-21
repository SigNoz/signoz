import { ServicesList } from 'types/api/metrics/getService';

export const getTotalRPS = (services: ServicesList[]): number =>
	services.reduce((accumulator, service) => accumulator + service.callRate, 0);
