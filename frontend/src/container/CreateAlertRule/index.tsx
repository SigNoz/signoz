import { Form } from 'antd';
import FormAlertRules from 'container/FormAlertRules';
import { baseQuery } from 'container/FormAlertRules/types';
import React from 'react';

function CreateAlertRule(): JSX.Element {
	const [formInstance] = Form.useForm();

	return (
		<FormAlertRules
			{...{
				formInstance,
				title: '',
				initialValue: {},
				initQueries: [
					{
						...baseQuery,
						name: 'A',
					},
				],
			}}
		/>
	);
}

export default CreateAlertRule;
