import '../CreateAlertV2/CreateAlertV2.styles.scss';

import { useShareBuilderUrl } from 'hooks/queryBuilder/useShareBuilderUrl';
import { mapQueryDataFromApi } from 'lib/newQueryBuilder/queryBuilderMappers/mapQueryDataFromApi';
import { useMemo } from 'react';
import { AlertTypes } from 'types/api/alerts/alertTypes';
import { PostableAlertRuleV2 } from 'types/api/alerts/alertTypesV2';

import AlertCondition from '../CreateAlertV2/AlertCondition';
import { buildInitialAlertDef } from '../CreateAlertV2/context/utils';
import Footer from '../CreateAlertV2/Footer';
import NotificationSettings from '../CreateAlertV2/NotificationSettings';
import QuerySection from '../CreateAlertV2/QuerySection';
import { Spinner } from '../CreateAlertV2/utils';

interface EditAlertV2Props {
	alertType?: AlertTypes;
	initialAlert: PostableAlertRuleV2;
}

function EditAlertV2({
	alertType = AlertTypes.METRICS_BASED_ALERT,
	initialAlert,
}: EditAlertV2Props): JSX.Element {
	const currentQueryToRedirect = useMemo(() => {
		const basicAlertDef = buildInitialAlertDef(alertType);
		return mapQueryDataFromApi(
			initialAlert?.condition.compositeQuery ||
				basicAlertDef.condition.compositeQuery,
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

EditAlertV2.defaultProps = {
	alertType: AlertTypes.METRICS_BASED_ALERT,
};

export default EditAlertV2;
