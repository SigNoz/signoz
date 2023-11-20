import { ServiceDataProps } from 'api/metrics/getTopLevelOperations';
import { Time } from 'container/TopNav/DateTimeSelection/config';
import { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
import { UseQueryResult } from 'react-query';
import { SuccessResponse } from 'types/api';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { ServicesList } from 'types/api/metrics/getService';

export default interface ServiceTableProps {
	services: ServicesList[];
	loading: boolean;
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

export interface GetServiceListFromQueryProps {
	queries: UseQueryResult<SuccessResponse<MetricRangePayloadProps>, Error>[];
	topLevelOperations: [keyof ServiceDataProps, string[]][];
	isLoading: boolean;
}
