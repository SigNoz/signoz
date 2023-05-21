import { InfoCircleFilled } from '@ant-design/icons';
import { Card, Form, Input, Space, Typography } from 'antd';

function EditGoogleAuth(): JSX.Element {
	return (
		<>
			<Typography.Paragraph>
				Enter OAuth 2.0 credentials obtained from the Google API Console below. Read
				the{' '}
				<a
					href="https://signoz.io/docs/userguide/sso-authentication"
					target="_blank"
					rel="noreferrer"
				>
					docs
				</a>{' '}
				for more information.
			</Typography.Paragraph>
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
