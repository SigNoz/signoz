import type { UseQueryResult } from 'react-query';
import type { ServiceDataProps } from 'api/metrics/getTopLevelOperations';
import type {
	CustomTimeType,
	Time,
} from 'container/TopNav/DateTimeSelectionV2/types';
import type { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
import type { SuccessResponse } from 'types/api';
import type { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import type { ServicesList } from 'types/api/metrics/getService';

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
}

export interface GetServiceListFromQueryProps {
	queries: UseQueryResult<SuccessResponse<MetricRangePayloadProps>, Error>[];
	topLevelOperations: [keyof ServiceDataProps, string[]][];
	isLoading: boolean;
}
