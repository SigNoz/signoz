import './Providers.styles.scss';

import { Callout } from '@signozhq/callout';
import { Checkbox, Form, Input, Typography } from 'antd';

function ConfigureOIDCAuthnProvider({
	isCreate,
}: {
	isCreate: boolean;
}): JSX.Element {
	return (
		<div className="saml">
			<section className="header">
				<Typography.Text className="title">
					Edit OIDC Authentication
				</Typography.Text>
			</section>

			<Form.Item
				label="Domain"
				name="name"
				tooltip={{
					title:
						'The email domain for users who should use SSO (e.g., `example.com` for users with `@example.com` emails)',
				}}
			>
				<Input disabled={!isCreate} />
			</Form.Item>

			<Form.Item
				label="Issuer URL"
				name={['oidcConfig', 'issuer']}
				tooltip={{
					title: `It is the URL identifier for the service. For example: "https://accounts.google.com" or "https://login.salesforce.com".`,
				}}
			>
				<Input />
			</Form.Item>

			<Form.Item
				label="Issuer Alias"
				name={['oidcConfig', 'issuerAlias']}
				tooltip={{
					title: `Some offspec providers like Azure, Oracle IDCS have oidc discovery url different from issuer url which causes issuerValidation to fail.
					This provides a way to override the Issuer url from the .well-known/openid-configuration issuer`,
				}}
			>
				<Input />
			</Form.Item>

			<Form.Item
				label="Client ID"
				name={['oidcConfig', 'clientId']}
				tooltip={{ title: `It is the application's ID.` }}
			>
				<Input />
			</Form.Item>

			<Form.Item
				label="Client Secret"
				name={['oidcConfig', 'clientSecret']}
				tooltip={{ title: `It is the application's secret.` }}
			>
				<Input />
			</Form.Item>

			<Form.Item
				label="Email Claim Mapping"
				name={['oidcConfig', 'claimMapping', 'email']}
				tooltip={{
					title: `Mapping of email claims to the corresponding email field in the token.`,
				}}
			>
				<Input />
			</Form.Item>

			<Form.Item
				label="Skip Email Verification"
				name={['oidcConfig', 'insecureSkipEmailVerified']}
				valuePropName="checked"
				className="field"
				tooltip={{
					title: `Whether to skip email verification. Defaults to "false"`,
				}}
			>
				<Checkbox />
			</Form.Item>

			<Form.Item
				label="Get User Info"
				name={['oidcConfig', 'getUserInfo']}
				valuePropName="checked"
				className="field"
				tooltip={{
					title: `Uses the userinfo endpoint to get additional claims for the token. This is especially useful where upstreams return "thin" id tokens`,
				}}
			>
				<Checkbox />
			</Form.Item>

			<Callout
				type="warning"
				size="small"
				showIcon
				description="OIDC won’t be enabled unless you enter all the attributes above"
				className="callout"
			/>
		</div>
	);
}

export default ConfigureOIDCAuthnProvider;
