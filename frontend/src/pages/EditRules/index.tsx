import './EditRules.styles.scss';

import { Button, Card } from 'antd';
import get from 'api/alerts/get';
import Spinner from 'components/Spinner';
import { QueryParams } from 'constants/query';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import ROUTES from 'constants/routes';
import EditRulesContainer from 'container/EditRules';
import { useNotifications } from 'hooks/useNotifications';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
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
	const { safeNavigate } = useSafeNavigate();
	const params = useUrlQuery();
	const ruleId = params.get(QueryParams.ruleId);
	const { t } = useTranslation('common');

	const isValidRuleId = ruleId !== null && String(ruleId).length !== 0;

	const { isLoading, data, isRefetching, isError } = useQuery(
		[REACT_QUERY_KEY.ALERT_RULE_DETAILS, ruleId],
		{
			queryFn: () =>
				get({
					id: parseInt(ruleId || '', 10),
				}),
			enabled: isValidRuleId,
			refetchOnMount: false,
			refetchOnWindowFocus: false,
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
			safeNavigate(ROUTES.LIST_ALL_ALERT);
		}
	}, [isValidRuleId, ruleId, notifications, safeNavigate]);

	if (
		(isError && !isValidRuleId) ||
		ruleId == null ||
		(data?.payload?.data === undefined && !isLoading)
	) {
		return (
			<div className="edit-rules-container edit-rules-container--error">
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
		<div className="edit-rules-container">
			<EditRulesContainer
				ruleId={parseInt(ruleId, 10)}
				initialValue={data.payload.data}
			/>
		</div>
	);
}

export default EditRules;
