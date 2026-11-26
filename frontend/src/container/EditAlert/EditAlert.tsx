import { useMemo } from 'react';
import { useShareBuilderUrl } from 'hooks/queryBuilder/useShareBuilderUrl';
import { AlertTypes, PostableAlertRuleV2 } from 'types/api/alerts/alertTypes';

import AlertCondition from '../CreateAlert/AlertCondition';
import { buildInitialAlertDef } from '../CreateAlert/context/utils';
import Footer from '../CreateAlert/Footer';
import NotificationSettings from '../CreateAlert/NotificationSettings';
import QuerySection from '../CreateAlert/QuerySection';
import { Spinner } from '../CreateAlert/utils';
import { getEditAlertQuery } from './utils';

import '../CreateAlert/CreateAlert.styles.scss';

interface EditAlertProps {
	alertType?: AlertTypes;
	initialAlert: PostableAlertRuleV2;
}

function EditAlert({
	alertType = AlertTypes.METRICS_BASED_ALERT,
	initialAlert,
}: EditAlertProps): JSX.Element {
	const currentQueryToRedirect = useMemo(() => {
		const basicAlertDef = buildInitialAlertDef(alertType);
		return getEditAlertQuery(
			initialAlert?.condition.compositeQuery ||
				basicAlertDef.condition.compositeQuery,
			alertType,
		);
	}, [initialAlert, alertType]);

	useShareBuilderUrl({ defaultValue: currentQueryToRedirect });

	return (
		<>
			<Spinner />
			<div className="create-alert-v2-container">
				<QuerySection />
				<AlertCondition />
				<NotificationSettings />
			</div>
			<Footer />
		</>
	);
}

EditAlert.defaultProps = {
	alertType: AlertTypes.METRICS_BASED_ALERT,
};

export default EditAlert;
