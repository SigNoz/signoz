import { Form, Row } from 'antd';
import FormAlertRules from 'container/FormAlertRules';
import { useGetCompositeQueryParam } from 'hooks/queryBuilder/useGetCompositeQueryParam';
import { useEffect, useState } from 'react';
import { AlertTypes } from 'types/api/alerts/alertTypes';
import { AlertDef } from 'types/api/alerts/def';

import { ALERT_TYPE_VS_SOURCE_MAPPING } from './config';
import {
	alertDefaults,
	exceptionAlertDefaults,
	logAlertDefaults,
	traceAlertDefaults,
} from './defaults';
import SelectAlertType from './SelectAlertType';

function CreateRules(): JSX.Element {
	const [initValues, setInitValues] = useState<AlertDef | null>(null);
	const [alertType, setAlertType] = useState<AlertTypes>(
		AlertTypes.METRICS_BASED_ALERT,
	);

	const compositeQuery = useGetCompositeQueryParam();

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
			default:
				setInitValues(alertDefaults);
		}
	};

	useEffect(() => {
		if (!compositeQuery) {
			return;
		}
		const dataSource = compositeQuery?.builder?.queryData[0]?.dataSource;

		const alertType = ALERT_TYPE_VS_SOURCE_MAPPING[dataSource];

		if (alertType) {
			onSelectType(alertType);
		}
	}, [compositeQuery]);

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
