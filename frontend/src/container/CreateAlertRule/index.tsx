import { Form } from 'antd';
import FormAlertRules from 'container/FormAlertRules';
import React, { useState } from 'react';
import { AlertTypes } from 'types/api/alerts/alertTypes';
import {
	alertDefaults,
	logAlertDefaults,
	traceAlertDefaults,
} from 'types/api/alerts/create';

import SelectAlertType from './SelectAlertType';
import { PanelContainer } from './styles';

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
			default:
				setInitValues(alertDefaults);
		}
		setStep(1);
	};

	if (step === 0) {
		return (
			<PanelContainer>
				<SelectAlertType onSelect={onSelectType} />
			</PanelContainer>
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
