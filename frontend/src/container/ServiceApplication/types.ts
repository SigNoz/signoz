import { ServiceDataProps } from 'api/metrics/getTopLevelOperations';
import { Time } from 'container/TopNav/DateTimeSelection/config';
import { GetQueryResultsProps } from 'store/actions/dashboard/getQueryResults';
import { ServicesList } from 'types/api/metrics/getService';

export default interface ServiceTableProps {
	services: ServicesList[];
	loading: boolean;
}

export interface ServiceApplicationProps {
	servicename: string;
}

export interface ServiceMetricsProps {
	topLevelOperations: [keyof ServiceDataProps, string[]][];
}

export interface ServiceMetricsTableProps {
	topLevelOperations: [keyof ServiceDataProps, string[]][];
	queryRangeRequestData: GetQueryResultsProps[];
}

export interface GetQueryRangeRequestDataProps {
	topLevelOperations: [keyof ServiceDataProps, string[]][];
	maxTime: number;
	minTime: number;
	globalSelectedInterval: Time;
}
