import { Space } from 'antd';
import getAll from 'api/alerts/getAll';
import logEvent from 'api/common/logEvent';
import Spinner from 'components/Spinner';
import { useNotifications } from 'hooks/useNotifications';
import { isUndefined } from 'lodash-es';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'react-query';

import { AlertsEmptyState } from './AlertsEmptyState/AlertsEmptyState';
import ListAlert from './ListAlert';

function ListAlertRules(): JSX.Element {
	const { t } = useTranslation('common');
	const { data, isError, isLoading, refetch, status } = useQuery('allAlerts', {
		queryFn: getAll,
		cacheTime: 0,
	});

	const logEventCalledRef = useRef(false);

	const { notifications } = useNotifications();

	useEffect(() => {
		if (!logEventCalledRef.current && !isUndefined(data?.payload)) {
			logEvent('Alert: List page visited', {
				number: data?.payload?.length,
			});
			logEventCalledRef.current = true;
		}
	}, [data?.payload]);

	useEffect(() => {
		if (status === 'error' || (status === 'success' && data.statusCode >= 400)) {
			notifications.error({
				message: data?.error || t('something_went_wrong'),
			});
		}
	}, [data?.error, data?.statusCode, status, t, notifications]);

	// api failed to load the data
	if (isError) {
		return <div>{data?.error || t('something_went_wrong')}</div>;
	}

	// api is successful but error is present
	if (status === 'success' && data.statusCode >= 400) {
		return (
			<ListAlert
				{...{
					allAlertRules: [],
					refetch,
				}}
			/>
		);
	}

	if (status === 'success' && !data.payload?.length) {
		return <AlertsEmptyState />;
	}

	// in case of loading
	if (isLoading || !data?.payload) {
		return <Spinner height="75vh" tip="Loading Rules..." />;
	}

	return (
		<Space direction="vertical" size="large" style={{ width: '100%' }}>
			<ListAlert
				{...{
					allAlertRules: data.payload,
					refetch,
				}}
			/>
		</Space>
	);
}

export default ListAlertRules;
