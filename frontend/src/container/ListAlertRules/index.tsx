import { Space } from 'antd';
import getAll from 'api/alerts/getAll';
import ReleaseNote from 'components/ReleaseNote';
import Spinner from 'components/Spinner';
import { useNotifications } from 'hooks/useNotifications';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'react-query';
import { useLocation } from 'react-router-dom';

import ListAlert from './ListAlert';

function ListAlertRules(): JSX.Element {
	const { t } = useTranslation('common');
	const location = useLocation();
	const { data, isError, isLoading, refetch, status } = useQuery('allAlerts', {
		queryFn: getAll,
		cacheTime: 0,
	});

	const { notifications } = useNotifications();

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

	// in case of loading
	if (isLoading || !data?.payload) {
		return <Spinner height="75vh" tip="Loading Rules..." />;
	}

	return (
		<Space direction="vertical" size="large" style={{ width: '100%' }}>
			<ReleaseNote path={location.pathname} />
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
