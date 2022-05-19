import React,  from 'react';
import { Form } from 'antd';
import FormAlertRules from 'container/FormAlertRules';

function CreateAlertRule(): JSX.Element {
	const [formInstance] = Form.useForm();
	// const [selectedConfig, setSelectedConfig] = useState();

	return (
		<FormAlertRules
			{...{
				formInstance,
				title: 'Create Alert',
				initialValue: {},
			}}
		/>
	);
}

export default CreateAlertRule;
