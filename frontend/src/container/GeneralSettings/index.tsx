import { Typography } from 'antd';
import getDisks from 'api/disks/getDisks';
import getRetentionPeriodApi from 'api/settings/getRetention';
import getRetentionPeriodApiV2 from 'api/settings/getRetentionV2';
import Spinner from 'components/Spinner';
import { useAppContext } from 'providers/App/App';
import { useTranslation } from 'react-i18next';
import { useQueries } from 'react-query';
import { ErrorResponse, SuccessResponse, SuccessResponseV2 } from 'types/api';
import APIError from 'types/api/error';
import { TTTLType } from 'types/api/settings/common';
import { PayloadProps as GetRetentionPeriodAPIPayloadProps } from 'types/api/settings/getRetention';

import GeneralSettingsContainer from './GeneralSettings';

type TRetentionAPIReturn<T extends TTTLType> = Promise<
	SuccessResponse<GetRetentionPeriodAPIPayloadProps<T>> | ErrorResponse
>;

type TRetentionAPIReturnV2<T extends TTTLType> = Promise<
	SuccessResponseV2<GetRetentionPeriodAPIPayloadProps<T>>
>;

function GeneralSettings(): JSX.Element {
	const { t } = useTranslation('common');
	const { user } = useAppContext();

	const [
		getRetentionPeriodMetricsApiResponse,
		getRetentionPeriodTracesApiResponse,
		getRetentionPeriodLogsApiResponse,
		getDisksResponse,
	] = useQueries([
		{
			queryFn: (): TRetentionAPIReturn<'metrics'> =>
				getRetentionPeriodApi('metrics'),
			queryKey: ['getRetentionPeriodApiMetrics', user?.accessJwt],
		},
		{
			queryFn: (): TRetentionAPIReturn<'traces'> =>
				getRetentionPeriodApi('traces'),
			queryKey: ['getRetentionPeriodApiTraces', user?.accessJwt],
		},
		{
			queryFn: (): TRetentionAPIReturnV2<'logs'> => getRetentionPeriodApiV2(), // Only works for logs
			queryKey: ['getRetentionPeriodApiLogs', user?.accessJwt],
		},
		{
			queryFn: getDisks,
			queryKey: ['getDisks', user?.accessJwt],
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
	// Error State - When RetentionPeriodLogsApi or getDiskApi gets errored out.
	if (getRetentionPeriodLogsApiResponse.isError || getDisksResponse.isError) {
		return (
			<Typography>
				{(getRetentionPeriodLogsApiResponse.error as APIError).getErrorMessage() ||
					getDisksResponse.data?.error ||
					t('something_went_wrong')}
			</Typography>
		);
	}

	// Loading State - When Metrics, Traces and Disk API are in progress and the promise has not been resolved/reject.
	if (
		getDisksResponse.isLoading ||
		!getDisksResponse.data?.payload ||
		getRetentionPeriodMetricsApiResponse.isLoading ||
		!getRetentionPeriodMetricsApiResponse.data?.payload ||
		getRetentionPeriodTracesApiResponse.isLoading ||
		!getRetentionPeriodTracesApiResponse.data?.payload ||
		getRetentionPeriodLogsApiResponse.isLoading ||
		!getRetentionPeriodLogsApiResponse.data?.data
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
				logsTtlValuesPayload: getRetentionPeriodLogsApiResponse.data?.data,
				logsTtlValuesRefetch: getRetentionPeriodLogsApiResponse.refetch,
			}}
		/>
	);
}

export type SettingPeriod = 'hr' | 'day' | 'month';

export default GeneralSettings;
