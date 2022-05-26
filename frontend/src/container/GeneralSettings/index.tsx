import { Typography } from 'antd';
import getDisks from 'api/disks/getDisks';
import getRetentionPeriodApi from 'api/settings/getRetention';
import Spinner from 'components/Spinner';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQueries } from 'react-query';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { TTTLType } from 'types/api/settings/common';
import { PayloadProps as GetRetentionPeriodAPIPayloadProps } from 'types/api/settings/getRetention';

import GeneralSettingsContainer from './GeneralSettings';

type TRetentionAPIReturn<T extends TTTLType> = Promise<
	SuccessResponse<GetRetentionPeriodAPIPayloadProps<T>> | ErrorResponse
>;

function GeneralSettings(): JSX.Element {
	const { t } = useTranslation('common');

	const [
		getRetentionPeriodMetricsApiResponse,
		getRetentionPeriodTracesApiResponse,
		getDisksResponse,
	] = useQueries([
		{
			queryFn: (): TRetentionAPIReturn<'metrics'> =>
				getRetentionPeriodApi('metrics'),
			queryKey: 'getRetentionPeriodApiMetrics',
		},
		{
			queryFn: (): TRetentionAPIReturn<'traces'> =>
				getRetentionPeriodApi('traces'),
			queryKey: 'getRetentionPeriodApiTraces',
		},
		{
			queryFn: getDisks,
			queryKey: 'getDisks',
		},
	]);

	// Error State - When RetentionPeriodMetricsApi or getDiskApi gets errored out.
	if (getRetentionPeriodMetricsApiResponse.isError || getDisksResponse.isError) {
		return (
			<Typography>
				{getRetentionPeriodMetricsApiResponse.data?.error ||
					getDisksResponse.data?.error ||
					t('something_went_wrong')}
			</Typography>
		);
	}

	// Error State - When RetentionPeriodTracesApi or getDiskApi gets errored out.
	if (getRetentionPeriodTracesApiResponse.isError || getDisksResponse.isError) {
		return (
			<Typography>
				{getRetentionPeriodTracesApiResponse.data?.error ||
					getDisksResponse.data?.error ||
					t('something_went_wrong')}
			</Typography>
		);
	}

	// Loading State - When Metrics, Traces and Disk API are in progress and the promise has not been resolved/reject.
	if (
		getRetentionPeriodMetricsApiResponse.isLoading ||
		getDisksResponse.isLoading ||
		!getDisksResponse.data?.payload ||
		!getRetentionPeriodMetricsApiResponse.data?.payload ||
		getRetentionPeriodTracesApiResponse.isLoading ||
		getDisksResponse.isLoading ||
		!getDisksResponse.data?.payload ||
		!getRetentionPeriodTracesApiResponse.data?.payload
	) {
		return <Spinner tip="Loading.." height="70vh" />;
	}

	return (
		<GeneralSettingsContainer
			{...{
				getAvailableDiskPayload: getDisksResponse.data?.payload,
				metricsTtlValuesPayload: getRetentionPeriodMetricsApiResponse.data?.payload,
				metricsTtlValuesRefetch: getRetentionPeriodMetricsApiResponse.refetch,
				tracesTtlValuesPayload: getRetentionPeriodTracesApiResponse.data?.payload,
				tracesTtlValuesRefetch: getRetentionPeriodTracesApiResponse.refetch,
			}}
		/>
	);
}

export type SettingPeriod = 'hr' | 'day' | 'month';

export default GeneralSettings;
