import { UseQueryResult } from 'react-query';
import { ServiceDataProps } from 'api/metrics/getTopLevelOperations';
import {
	CustomTimeType,
	Time,
} from 'container/TopNav/DateTimeSelectionV2/types';
import { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
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
	globalSelectedInterval: Time | CustomTimeType;
	dotMetricsEnabled: boolean;
}

export interface GetServiceListFromQueryProps {
	queries: UseQueryResult<SuccessResponse<MetricRangePayloadProps>, Error>[];
	topLevelOperations: [keyof ServiceDataProps, string[]][];
	isLoading: boolean;
}
