import { ServiceDataProps } from 'api/metrics/getTopLevelOperations';
import { GetQueryResultsProps } from 'store/actions/dashboard/getQueryResults';
import { ServicesList } from 'types/api/metrics/getService';

export default interface ServiceTableProps {
	services: ServicesList[];
	loading: boolean;
	error: boolean;
}

export interface ServiceApplicationProps {
	servicename: string;
}

export interface ServiceMetricsProps {
	topLevelOperations: [keyof ServiceDataProps, string[]][];
	loading: boolean;
	error: boolean;
}

export interface ServiceMetricsTableProps {
	topLevelOperations: [keyof ServiceDataProps, string[]][];
	queryRangeRequestData: GetQueryResultsProps[];
}
