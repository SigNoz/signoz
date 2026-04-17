import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Space } from 'antd';
import logEvent from 'api/common/logEvent';
import { convertToApiError } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import { useListRules } from 'api/generated/services/rules';
import { RenderErrorResponseDTO } from 'api/generated/services/sigNoz.schemas';
import { AxiosError } from 'axios';
import Spinner from 'components/Spinner';
import { useNotifications } from 'hooks/useNotifications';

import { AlertsEmptyState } from './AlertsEmptyState/AlertsEmptyState';
import ListAlert from './ListAlert';

function ListAlertRules(): JSX.Element {
	const { t } = useTranslation('common');
	const { data, isError, isLoading, refetch, error } = useListRules({
		query: { cacheTime: 0 },
	});

	const rules = data?.data ?? [];
	const hasLoaded = !isLoading && data !== undefined;
	const logEventCalledRef = useRef(false);

	const { notifications } = useNotifications();

	const apiError = useMemo(
		() => convertToApiError(error as AxiosError<RenderErrorResponseDTO> | null),
		[error],
	);

	useEffect(() => {
		if (!logEventCalledRef.current && hasLoaded) {
			logEvent('Alert: List page visited', {
				number: rules.length,
			});
			logEventCalledRef.current = true;
		}
	}, [hasLoaded, rules.length]);

	useEffect(() => {
		if (isError) {
			notifications.error({
				message: apiError?.getErrorMessage() || t('something_went_wrong'),
			});
		}
	}, [isError, apiError, t, notifications]);

	if (isError) {
		return <div>{apiError?.getErrorMessage() || t('something_went_wrong')}</div>;
	}

	if (isLoading || !data) {
		return <Spinner height="75vh" tip="Loading Rules..." />;
	}

	if (rules.length === 0) {
		return <AlertsEmptyState />;
	}

	return (
		<Space direction="vertical" size="large" style={{ width: '100%' }}>
			<ListAlert allAlertRules={rules} refetch={refetch} />
		</Space>
	);
}

export default ListAlertRules;
