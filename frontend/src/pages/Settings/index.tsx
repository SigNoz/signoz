import { Form, Input, Space } from 'antd';
import { Alert } from 'antd';
import React, { useEffect } from 'react';

const SettingsPage = (): JSX.Element => {
	const [form] = Form.useForm();

	useEffect(() => {
		form.setFieldsValue({
			retention_period: '3 days',
		});
	}, [form]);

	return (
		<>
			<Form name="basic" initialValues={{ remember: true }} form={form}>
				<Form.Item
					label="Retention Period"
					name="retention_period"
					rules={[{ required: false }]}
					style={{ maxWidth: '40%' }}
				>
					<Input disabled={true} />
				</Form.Item>
			</Form>

			<Space>
				<Alert
					message="Mail us at support@signoz.io to get instructions on how to change your retention period"
					type="info"
				/>
			</Space>
		</>
	);
};

export default SettingsPage;
