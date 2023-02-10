import { Form, Row } from 'antd';
import FormAlertRules from 'container/FormAlertRules';
import React, { useState } from 'react';
import { AlertTypes } from 'types/api/alerts/alertTypes';

import {
	alertDefaults,
	exceptionAlertDefaults,
	logAlertDefaults,
	traceAlertDefaults,
} from './defaults';
import SelectAlertType from './SelectAlertType';

function CreateRules(): JSX.Element {
	const [initValues, setInitValues] = useState(alertDefaults);
	const [step, setStep] = useState(0);
	const [alertType, setAlertType] = useState<AlertTypes>(
		AlertTypes.METRICS_BASED_ALERT,
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
			default:
				setInitValues(alertDefaults);
		}
		setStep(1);
	};

	if (step === 0) {
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
