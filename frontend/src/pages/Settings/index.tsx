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
			<Form
				labelCol={{
					span: 3,
				}}
				wrapperCol={{ span: 6 }}
				name="basic"
				initialValues={{ remember: true }}
				style={{ marginLeft: 20 }}
				form={form}
			>
				<Form.Item
					label="Retention Period"
					name="retention_period"
					rules={[{ required: false }]}
				>
					<Input style={{ marginLeft: 60 }} disabled={true} />
				</Form.Item>
			</Form>

			<Space style={{ marginLeft: 60, marginTop: 48 }}>
				<Alert
					message="Mail us at support@signoz.io to get instructions on how to change your retention period"
					type="info"
				/>
			</Space>
		</>
	);
};

export default SettingsPage;
