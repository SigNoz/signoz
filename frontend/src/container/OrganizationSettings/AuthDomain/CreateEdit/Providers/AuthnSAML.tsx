import './Providers.styles.scss';

import { Callout } from '@signozhq/callout';
import { Checkbox, Form, Input, Typography } from 'antd';

function ConfigureSAMLAuthnProvider({
	isCreate,
}: {
	isCreate: boolean;
}): JSX.Element {
	return (
		<div className="saml">
			<section className="header">
				<Typography.Text className="title">
					Edit SAML Authentication
				</Typography.Text>
			</section>

			<Form.Item label="Domain" name="name">
				<Input disabled={!isCreate} />
			</Form.Item>

			<Form.Item label="SAML ACS URL" name={['samlConfig', 'samlIdp']}>
				<Input />
			</Form.Item>

			<Form.Item label="SAML Entity ID" name={['samlConfig', 'samlEntity']}>
				<Input />
			</Form.Item>

			<Form.Item label="SAML X.509 Certificate" name={['samlConfig', 'samlCert']}>
				<Input.TextArea rows={4} />
			</Form.Item>

			<Form.Item
				label="Skip Signing AuthN Requests"
				name={['samlConfig', 'insecureSkipAuthNRequestsSigned']}
				valuePropName="checked"
				className="field"
			>
				<Checkbox />
			</Form.Item>

			<Callout
				type="warning"
				size="small"
				showIcon
				description="SAML won’t be enabled unless you enter all the attributes above"
				className="callout"
			/>
		</div>
	);
}

export default ConfigureSAMLAuthnProvider;
