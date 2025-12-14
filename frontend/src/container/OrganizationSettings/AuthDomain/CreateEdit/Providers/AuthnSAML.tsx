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
				label="SAML ACS URL"
				name={['samlConfig', 'samlIdp']}
				tooltip={{
					title: `The SSO endpoint of the SAML identity provider. It can typically be found in the SingleSignOnService element in the SAML metadata of the identity provider. Example: <md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="{samlIdp}"/>`,
				}}
			>
				<Input />
			</Form.Item>

			<Form.Item
				label="SAML Entity ID"
				name={['samlConfig', 'samlEntity']}
				tooltip={{
					title: `The entityID of the SAML identity provider. It can typically be found in the EntityID attribute of the EntityDescriptor element in the SAML metadata of the identity provider. Example: <md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" entityID="{samlEntity}">`,
				}}
			>
				<Input />
			</Form.Item>

			<Form.Item
				label="SAML X.509 Certificate"
				name={['samlConfig', 'samlCert']}
				tooltip={{
					title: `The certificate of the SAML identity provider. It can typically be found in the X509Certificate element in the SAML metadata of the identity provider. Example: <ds:X509Certificate><ds:X509Certificate>{samlCert}</ds:X509Certificate></ds:X509Certificate>`,
				}}
			>
				<Input.TextArea rows={4} />
			</Form.Item>

			<Form.Item
				label="Skip Signing AuthN Requests"
				name={['samlConfig', 'insecureSkipAuthNRequestsSigned']}
				valuePropName="checked"
				className="field"
				tooltip={{
					title: `Whether to skip signing the SAML requests. It can typically be found in the WantAuthnRequestsSigned attribute of the IDPSSODescriptor element in the SAML metadata of the identity provider. Example: <md:IDPSSODescriptor WantAuthnRequestsSigned="false" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
					For providers like jumpcloud, this should be set to true.Note: This is the reverse of WantAuthnRequestsSigned. If WantAuthnRequestsSigned is false, then InsecureSkipAuthNRequestsSigned should be true.`,
				}}
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
