import React from 'react';
import { Form, Input } from 'antd';
import FormItem from 'antd/lib/form/FormItem';

const Slack = () => {
	const [form] = Form.useForm();

	return (
		<Form layout="vertical" form={form}>
			<FormItem label="Webhook URL">
				<Input />
			</FormItem>

			<FormItem
				help={
					'Specify channel or user, use #channel-name, @username (has to be all lowercase, no whitespace),'
				}
				label="Recipient"
			>
				<Input />
			</FormItem>
		</Form>
	);
};

export default Slack;
