import { InfoCircleFilled } from '@ant-design/icons';
import { Card, Form, Input, Space, Typography } from 'antd';
import React from 'react';

function EditGoogleAuth(): JSX.Element {
	return (
		<>
			<Form.Item
				label="Client ID"
				name={['googleAuthConfig', 'clientId']}
				rules={[{ required: true, message: 'Please input Google Auth Client ID!' }]}
			>
				<Input />
			</Form.Item>

			<Form.Item
				label="Client Secret"
				name={['googleAuthConfig', 'clientSecret']}
				rules={[
					{ required: true, message: 'Please input Google Auth Client Secret!' },
				]}
			>
				<Input />
			</Form.Item>

			<Card style={{ marginBottom: '1rem' }}>
				<Space>
					<InfoCircleFilled />
					<Typography>
						Google OAuth2 won’t be enabled unless you enter all the attributes above
					</Typography>
				</Space>
			</Card>
		</>
	);
}

export default EditGoogleAuth;
