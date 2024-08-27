import get from 'api/alerts/get';
import Spinner from 'components/Spinner';
import { QueryParams } from 'constants/query';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import ROUTES from 'constants/routes';
import EditRulesContainer from 'container/EditRules';
import { useNotifications } from 'hooks/useNotifications';
import history from 'lib/history';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'react-query';
import { useLocation } from 'react-router-dom';

function EditRules(): JSX.Element {
	const { search } = useLocation();
	const params = new URLSearchParams(search);
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
		return <div>{data?.error || t('something_went_wrong')}</div>;
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
