import './EditRules.styles.scss';

import { Button, Card } from 'antd';
import get from 'api/alerts/get';
import Spinner from 'components/Spinner';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import EditRulesContainer from 'container/EditRules';
import { useNotifications } from 'hooks/useNotifications';
import useUrlQuery from 'hooks/useUrlQuery';
import history from 'lib/history';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'react-query';

import {
	errorMessageReceivedFromBackend,
	improvedErrorMessage,
	returnToAlertsPage,
} from './constants';

function EditRules(): JSX.Element {
	const params = useUrlQuery();
	const ruleId = params.get('ruleId');
	const { t } = useTranslation('common');

	const isValidRuleId = ruleId !== null && String(ruleId).length !== 0;

	const { isLoading, data, isRefetching, isError } = useQuery(
		['ruleId', ruleId],
		{
			queryFn: () =>
				get({
					id: parseInt(ruleId || '', 10),
				}),
			enabled: isValidRuleId,
		},
	);

	const { notifications } = useNotifications();

	const clickHandler = (): void => {
		params.delete(QueryParams.compositeQuery);
		params.delete(QueryParams.panelTypes);
		params.delete(QueryParams.ruleId);
		params.delete(QueryParams.relativeTime);
		history.push(`${ROUTES.LIST_ALL_ALERT}?${params.toString()}`);
	};

	useEffect(() => {
		if (!isValidRuleId) {
			notifications.error({
				message: 'Rule Id is required',
			});
			history.replace(ROUTES.LIST_ALL_ALERT);
		}
	}, [isValidRuleId, ruleId, notifications]);

	if (
		(isError && !isValidRuleId) ||
		ruleId == null ||
		(data?.payload?.data === undefined && !isLoading)
	) {
		return (
			<div className="edit-rules-container">
				<Card size="small" className="edit-rules-card">
					<p className="content">
						{data?.message === errorMessageReceivedFromBackend
							? improvedErrorMessage
							: data?.error || t('something_went_wrong')}
					</p>
					<div className="btn-container">
						<Button type="default" size="large" onClick={clickHandler}>
							{returnToAlertsPage}
						</Button>
					</div>
				</Card>
			</div>
		);
	}

	if (isLoading || isRefetching || !data?.payload) {
		return <Spinner tip="Loading Rules..." />;
	}

	return (
		<EditRulesContainer
			ruleId={parseInt(ruleId, 10)}
			initialValue={data.payload.data}
		/>
	);
}

export default EditRules;
