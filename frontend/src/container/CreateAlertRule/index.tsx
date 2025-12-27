import { Form } from 'antd';
import { ENTITY_VERSION_V5 } from 'constants/app';
import { QueryParams } from 'constants/query';
import CreateAlertV2 from 'container/CreateAlertV2';
import FormAlertRules, { AlertDetectionTypes } from 'container/FormAlertRules';
import { useGetCompositeQueryParam } from 'hooks/queryBuilder/useGetCompositeQueryParam';
import useUrlQuery from 'hooks/useUrlQuery';
import { useMemo } from 'react';
import { AlertTypes } from 'types/api/alerts/alertTypes';
import { AlertDef } from 'types/api/alerts/def';

import { ALERT_TYPE_VS_SOURCE_MAPPING } from './config';
import { ALERTS_VALUES_MAP } from './defaults';

function CreateRules(): JSX.Element {
	const [formInstance] = Form.useForm();
	const compositeQuery = useGetCompositeQueryParam();
	const queryParams = useUrlQuery();

	const ruleTypeFromURL = queryParams.get(QueryParams.ruleType);
	const alertTypeFromURL = queryParams.get(QueryParams.alertType);
	const version = queryParams.get(QueryParams.version);
	const showNewCreateAlertsPageFlag =
		queryParams.get(QueryParams.showNewCreateAlertsPage) === 'true';

	const alertType = useMemo(() => {
		if (ruleTypeFromURL === AlertDetectionTypes.ANOMALY_DETECTION_ALERT) {
			return AlertTypes.ANOMALY_BASED_ALERT;
		}
		if (!alertTypeFromURL) {
			const dataSource = compositeQuery?.builder.queryData?.[0]?.dataSource;
			if (dataSource) {
				return ALERT_TYPE_VS_SOURCE_MAPPING[dataSource];
			}
			return AlertTypes.METRICS_BASED_ALERT;
		}
		return alertTypeFromURL as AlertTypes;
	}, [alertTypeFromURL, ruleTypeFromURL, compositeQuery?.builder.queryData]);

	const initialAlertValue: AlertDef = useMemo(
		() => ({
			...ALERTS_VALUES_MAP[alertType],
			version: version || ENTITY_VERSION_V5,
		}),
		[alertType, version],
	);

	if (
		showNewCreateAlertsPageFlag &&
		alertType !== AlertTypes.ANOMALY_BASED_ALERT
	) {
		return <CreateAlertV2 alertType={alertType} />;
	}

	return (
		<FormAlertRules
			alertType={alertType}
			formInstance={formInstance}
			initialValue={initialAlertValue}
			ruleId=""
		/>
	);
}

export default CreateRules;
