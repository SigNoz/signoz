import { Form, Row } from 'antd';
import logEvent from 'api/common/logEvent';
import { ENTITY_VERSION_V4 } from 'constants/app';
import { QueryParams } from 'constants/query';
import FormAlertRules, { AlertDetectionTypes } from 'container/FormAlertRules';
import { useGetCompositeQueryParam } from 'hooks/queryBuilder/useGetCompositeQueryParam';
import history from 'lib/history';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AlertTypes } from 'types/api/alerts/alertTypes';
import { AlertDef } from 'types/api/alerts/def';

import { ALERT_TYPE_VS_SOURCE_MAPPING } from './config';
import {
	alertDefaults,
	anamolyAlertDefaults,
	exceptionAlertDefaults,
	logAlertDefaults,
	traceAlertDefaults,
} from './defaults';
import SelectAlertType from './SelectAlertType';

function CreateRules(): JSX.Element {
	const [initValues, setInitValues] = useState<AlertDef | null>(null);

	const location = useLocation();
	const queryParams = new URLSearchParams(location.search);
	const alertTypeFromURL = queryParams.get(QueryParams.ruleType);
	const version = queryParams.get('version');
	const alertTypeFromParams =
		alertTypeFromURL === AlertDetectionTypes.ANOMALY_DETECTION_ALERT
			? AlertTypes.ANOMALY_BASED_ALERT
			: queryParams.get(QueryParams.alertType);

	const compositeQuery = useGetCompositeQueryParam();
	function getAlertTypeFromDataSource(): AlertTypes | null {
		if (!compositeQuery) {
			return null;
		}
		const dataSource = compositeQuery?.builder?.queryData[0]?.dataSource;

		return ALERT_TYPE_VS_SOURCE_MAPPING[dataSource];
	}

	const [alertType, setAlertType] = useState<AlertTypes>(
		(alertTypeFromParams as AlertTypes) || getAlertTypeFromDataSource(),
	);

	const [formInstance] = Form.useForm();

	const onSelectType = (typ: AlertTypes): void => {
		setAlertType(typ);

		switch (typ) {
			case AlertTypes.LOGS_BASED_ALERT:
				setInitValues(logAlertDefaults);
				break;
			case AlertTypes.TRACES_BASED_ALERT:
				setInitValues(traceAlertDefaults);
				break;
			case AlertTypes.EXCEPTIONS_BASED_ALERT:
				setInitValues(exceptionAlertDefaults);
				break;
			case AlertTypes.ANOMALY_BASED_ALERT:
				setInitValues({
					...anamolyAlertDefaults,
					version: version || ENTITY_VERSION_V4,
					ruleType: AlertDetectionTypes.ANOMALY_DETECTION_ALERT,
				});
				break;
			default:
				setInitValues({
					...alertDefaults,
					version: version || ENTITY_VERSION_V4,
					ruleType: AlertDetectionTypes.THRESHOLD_ALERT,
				});
		}

		queryParams.set(
			QueryParams.alertType,
			typ === AlertTypes.ANOMALY_BASED_ALERT
				? AlertTypes.METRICS_BASED_ALERT
				: typ,
		);

		if (
			typ === AlertTypes.ANOMALY_BASED_ALERT ||
			alertTypeFromURL === AlertDetectionTypes.ANOMALY_DETECTION_ALERT
		) {
			queryParams.set(
				QueryParams.ruleType,
				AlertDetectionTypes.ANOMALY_DETECTION_ALERT,
			);
		} else {
			queryParams.set(QueryParams.ruleType, AlertDetectionTypes.THRESHOLD_ALERT);
		}

		const generatedUrl = `${location.pathname}?${queryParams.toString()}`;
		history.replace(generatedUrl);
	};

	useEffect(() => {
		if (alertType) {
			onSelectType(alertType);
		} else {
			logEvent('Alert: New alert data source selection page visited', {});
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [alertType]);

	if (!initValues) {
		return (
			<Row wrap={false}>
				<SelectAlertType onSelect={onSelectType} />
			</Row>
		);
	}

	return (
		<FormAlertRules
			alertType={alertType}
			formInstance={formInstance}
			initialValue={initValues}
			ruleId={0}
		/>
	);
}

export default CreateRules;
