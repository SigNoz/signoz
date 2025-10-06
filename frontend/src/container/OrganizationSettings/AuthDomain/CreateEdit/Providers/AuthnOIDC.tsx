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

			<Form.Item label="Domain" name="name">
				<Input disabled={!isCreate} />
			</Form.Item>

			<Form.Item label="Issuer URL" name={['oidcConfig', 'issuer']}>
				<Input />
			</Form.Item>

			<Form.Item label="Issuer Alias" name={['oidcConfig', 'issuerAlias']}>
				<Input />
			</Form.Item>

			<Form.Item label="Client ID" name={['oidcConfig', 'clientId']}>
				<Input />
			</Form.Item>

			<Form.Item label="Client Secret" name={['oidcConfig', 'clientSecret']}>
				<Input />
			</Form.Item>

			<Form.Item
				label="Email Claim Mapping"
				name={['oidcConfig', 'claimMapping', 'email']}
			>
				<Input />
			</Form.Item>

			<Form.Item
				label="Skip Email Verification"
				name={['oidcConfig', 'insecureSkipEmailVerified']}
				valuePropName="checked"
				className="field"
			>
				<Checkbox />
			</Form.Item>

			<Form.Item
				label="Get User Info"
				name={['oidcConfig', 'getUserInfo']}
				valuePropName="checked"
				className="field"
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
