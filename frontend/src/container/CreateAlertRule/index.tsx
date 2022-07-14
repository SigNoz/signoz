import { Form } from 'antd';
import FormAlertRules from 'container/FormAlertRules';
import React from 'react';
import { AlertDef } from 'types/api/alerts/def';

function CreateRules({ initialValue }: CreateRulesProps): JSX.Element {
	const [formInstance] = Form.useForm();

	return (
		<FormAlertRules
			formInstance={formInstance}
			initialValue={initialValue}
			ruleId={0}
		/>
	);
}

interface CreateRulesProps {
	initialValue: AlertDef;
}

export default CreateRules;
