import './Providers.styles.scss';

import { Callout } from '@signozhq/callout';
import { Form, Input, Typography } from 'antd';

function ConfigureGoogleAuthAuthnProvider({
	isCreate,
}: {
	isCreate: boolean;
}): JSX.Element {
	return (
		<div className="google-auth">
			<section className="header">
				<Typography.Text className="title">
					Edit Google Authentication
				</Typography.Text>
				<Typography.Paragraph className="description">
					Enter OAuth 2.0 credentials obtained from the Google API Console below.
					Read the{' '}
					<a
						href="https://signoz.io/docs/userguide/sso-authentication"
						target="_blank"
						rel="noreferrer"
					>
						docs
					</a>{' '}
					for more information.
				</Typography.Paragraph>
			</section>

			<Form.Item
				label="Domain"
				name="name"
				className="field"
				tooltip={{
					title:
						'The email domain for users who should use SSO (e.g., `example.com` for users with `@example.com` emails)',
				}}
			>
				<Input disabled={!isCreate} />
			</Form.Item>

			<Form.Item
				label="Client ID"
				name={['googleAuthConfig', 'clientId']}
				className="field"
				tooltip={{
					title: `ClientID is the application's ID. For example, 292085223830.apps.googleusercontent.com.`,
				}}
			>
				<Input />
			</Form.Item>

			<Form.Item
				label="Client Secret"
				name={['googleAuthConfig', 'clientSecret']}
				className="field"
				tooltip={{
					title: `It is the application's secret.`,
				}}
			>
				<Input />
			</Form.Item>

			<Callout
				type="warning"
				size="small"
				showIcon
				description="Google OAuth2 won’t be enabled unless you enter all the attributes above"
				className="callout"
			/>
		</div>
	);
}

export default ConfigureGoogleAuthAuthnProvider;
