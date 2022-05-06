import { Typography } from 'antd';
import getDisks from 'api/disks/getDisks';
import getRetentionPeriodApi from 'api/settings/getRetention';
import Spinner from 'components/Spinner';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQueries } from 'react-query';

import GeneralSettingsContainer from './GeneralSettings';

function GeneralSettings(): JSX.Element {
	const { t } = useTranslation('common');
	const [getRetentionPeriodApiResponse, getDisksResponse] = useQueries([
		{
			queryFn: getRetentionPeriodApi,
			queryKey: 'getRetentionPeriodApi',
		},
		{
			queryFn: getDisks,
			queryKey: 'getDisks',
		},
	]);

	if (getRetentionPeriodApiResponse.isError || getDisksResponse.isError) {
		return (
			<Typography>
				{getRetentionPeriodApiResponse.data?.error ||
					getDisksResponse.data?.error ||
					t('something_went_wrong')}
			</Typography>
		);
	}

	if (
		getRetentionPeriodApiResponse.isLoading ||
		getDisksResponse.isLoading ||
		!getDisksResponse.data?.payload ||
		!getRetentionPeriodApiResponse.data?.payload
	) {
		return <Spinner tip="Loading.." height="70vh" />;
	}

	return (
		<GeneralSettingsContainer
			{...{
				getAvailableDiskPayload: getDisksResponse.data?.payload,
				ttlValuesPayload: getRetentionPeriodApiResponse.data?.payload,
			}}
		/>
	);
}

export type SettingPeriod = 'hr' | 'day' | 'month';

export default GeneralSettings;
