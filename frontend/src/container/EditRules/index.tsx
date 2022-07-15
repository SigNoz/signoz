import { Form } from 'antd';
import FormAlertRules from 'container/FormAlertRules';
import React from 'react';
import { AlertDef } from 'types/api/alerts/def';

function EditRules({ initialValue, ruleId }: EditRulesProps): JSX.Element {
	const [formInstance] = Form.useForm();

	return (
		<FormAlertRules
			formInstance={formInstance}
			initialValue={initialValue}
			ruleId={ruleId}
		/>
	);
}

interface EditRulesProps {
	initialValue: AlertDef;
	ruleId: number;
}

export default EditRules;
