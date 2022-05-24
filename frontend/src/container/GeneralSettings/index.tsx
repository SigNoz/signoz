import { Typography } from 'antd';
import getDisks from 'api/disks/getDisks';
import getRetentionPeriodApi from 'api/settings/getRetention';
import Spinner from 'components/Spinner';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQueries } from 'react-query';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { PayloadProps as GetRetentionPeriodAPIPayloadProps } from 'types/api/settings/getRetention';

import GeneralSettingsContainer from './GeneralSettings';

function GeneralSettings(): JSX.Element {
	const { t } = useTranslation('common');
	const [
		getRetentionPeriodMetricsApiResponse,
		getRetentionPeriodTracesApiResponse,
		getDisksResponse,
	] = useQueries([
		{
			queryFn: (): Promise<
				| SuccessResponse<GetRetentionPeriodAPIPayloadProps<'metrics'>>
				| ErrorResponse
			> => getRetentionPeriodApi('metrics'),
			queryKey: 'getRetentionPeriodApiMetrics',
		},
		{
			queryFn: (): Promise<
				SuccessResponse<GetRetentionPeriodAPIPayloadProps<'traces'>> | ErrorResponse
			> => getRetentionPeriodApi('traces'),
			queryKey: 'getRetentionPeriodApiTraces',
		},
		{
			queryFn: getDisks,
			queryKey: 'getDisks',
		},
	]);

	if (getRetentionPeriodMetricsApiResponse.isError || getDisksResponse.isError) {
		return (
			<Typography>
				{getRetentionPeriodMetricsApiResponse.data?.error ||
					getDisksResponse.data?.error ||
					t('something_went_wrong')}
			</Typography>
		);
	}

	if (getRetentionPeriodTracesApiResponse.isError || getDisksResponse.isError) {
		return (
			<Typography>
				{getRetentionPeriodTracesApiResponse.data?.error ||
					getDisksResponse.data?.error ||
					t('something_went_wrong')}
			</Typography>
		);
	}

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
