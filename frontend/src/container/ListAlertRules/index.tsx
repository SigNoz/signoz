import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Space } from 'antd';
import logEvent from 'api/common/logEvent';
import { useListRules } from 'api/generated/services/rules';
import Spinner from 'components/Spinner';
import { useNotifications } from 'hooks/useNotifications';
import { isUndefined } from 'lodash-es';

import { AlertsEmptyState } from './AlertsEmptyState/AlertsEmptyState';
import ListAlert from './ListAlert';

function ListAlertRules(): JSX.Element {
	const { t } = useTranslation('common');
	const { data, isError, isLoading, refetch, error } = useListRules({
		query: { cacheTime: 0 },
	});

	const rules = data?.data?.rules;
	const logEventCalledRef = useRef(false);

	const { notifications } = useNotifications();

	useEffect(() => {
		if (!logEventCalledRef.current && !isUndefined(rules)) {
			logEvent('Alert: List page visited', {
				number: rules?.length,
			});
			logEventCalledRef.current = true;
		}
	}, [rules]);

	useEffect(() => {
		if (isError) {
			notifications.error({
				message: (error as any)?.message || t('something_went_wrong'),
			});
		}
	}, [isError, error, t, notifications]);

	if (isError) {
		return <div>{(error as any)?.message || t('something_went_wrong')}</div>;
	}

	if (!isLoading && rules && rules.length === 0) {
		return <AlertsEmptyState />;
	}

	if (isLoading || !rules) {
		return <Spinner height="75vh" tip="Loading Rules..." />;
	}

	return (
		<Space direction="vertical" size="large" style={{ width: '100%' }}>
			<ListAlert
				{...{
					allAlertRules: rules as any,
					refetch: refetch as any,
				}}
			/>
		</Space>
	);
}

export default ListAlertRules;
