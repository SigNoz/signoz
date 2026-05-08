import { GoogleSquareFilled, KeyOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { Typography } from '@signozhq/ui';
import { AuthtypesAuthNProviderDTO } from 'api/generated/services/sigNoz.schemas';

import './CreateEdit.styles.scss';

interface AuthNProvider {
	key: AuthtypesAuthNProviderDTO;
	title: string;
	description: string;
	icon: JSX.Element;
	enabled: boolean;
}

function getAuthNProviders(samlEnabled: boolean): AuthNProvider[] {
	return [
		{
			key: AuthtypesAuthNProviderDTO.google_auth,
			title: 'Google Apps Authentication',
			description: 'Let members sign-in with a Google workspace account',
			icon: <GoogleSquareFilled style={{ fontSize: '37px' }} />,
			enabled: true,
		},
		{
			key: AuthtypesAuthNProviderDTO.saml,
			title: 'SAML Authentication',
			description:
				'Azure, Active Directory, Okta or your custom SAML 2.0 solution',
			icon: <KeyOutlined style={{ fontSize: '37px' }} />,
			enabled: samlEnabled,
		},

		{
			key: AuthtypesAuthNProviderDTO.oidc,
			title: 'OIDC Authentication',
			description:
				'Authenticate using OpenID Connect providers like Azure, Active Directory, Okta, or other OIDC compliant solutions',
			icon: <KeyOutlined style={{ fontSize: '37px' }} />,
			enabled: samlEnabled,
		},
	];
}

function AuthnProviderSelector({
	setAuthnProvider,
	samlEnabled,
}: {
	setAuthnProvider: React.Dispatch<
		React.SetStateAction<AuthtypesAuthNProviderDTO | ''>
	>;
	samlEnabled: boolean;
}): JSX.Element {
	const authnProviders = getAuthNProviders(samlEnabled);
	return (
		<div className="authn-provider-selector">
			<section className="header">
				<Typography.Title level={4}>
					Configure Authentication Method
				</Typography.Title>
				<Typography.Text italic>
					SigNoz supports the following single sign-on services (SSO). Get started
					with setting your project’s SSO below
				</Typography.Text>
			</section>
			<section className="selector">
				{authnProviders.map((provider) => {
					if (provider.enabled) {
						return (
							<section key={provider.key} className="provider">
								<span className="icon">{provider.icon}</span>
								<div className="title-description">
									<Typography.Text className="title">{provider.title}</Typography.Text>
									<Typography.Text className="description">
										{provider.description}
									</Typography.Text>
								</div>
								<Button
									onClick={(): void => setAuthnProvider(provider.key)}
									type="primary"
								>
									Configure
								</Button>
							</section>
						);
					}
					return <div key={provider.key} />;
				})}
			</section>
		</div>
	);
}

export default AuthnProviderSelector;
