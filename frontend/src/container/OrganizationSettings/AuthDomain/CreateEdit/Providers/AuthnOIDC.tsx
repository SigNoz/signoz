import { useCallback, useState } from 'react';
import { Callout } from '@signozhq/callout';
import { Checkbox } from '@signozhq/checkbox';
import { Style } from '@signozhq/design-tokens';
import { CircleHelp } from '@signozhq/icons';
import { Input } from '@signozhq/input';
import { Form, Tooltip } from 'antd';

import ClaimMappingSection from './components/ClaimMappingSection';
import RoleMappingSection from './components/RoleMappingSection';

import './Providers.styles.scss';

type ExpandedSection = 'claim-mapping' | 'role-mapping' | null;

function ConfigureOIDCAuthnProvider({
	isCreate,
}: {
	isCreate: boolean;
}): JSX.Element {
	const form = Form.useFormInstance();

	const [expandedSection, setExpandedSection] = useState<ExpandedSection>(null);

	const handleClaimMappingChange = useCallback((expanded: boolean): void => {
		setExpandedSection(expanded ? 'claim-mapping' : null);
	}, []);

	const handleRoleMappingChange = useCallback((expanded: boolean): void => {
		setExpandedSection(expanded ? 'role-mapping' : null);
	}, []);

	return (
		<div className="authn-provider">
			<section className="authn-provider__header">
				<h3 className="authn-provider__title">Edit OIDC Authentication</h3>
				<p className="authn-provider__description">
					Configure OpenID Connect Single Sign-On with your Identity Provider. Read
					the{' '}
					<a
						href="https://signoz.io/docs/userguide/sso-authentication"
						target="_blank"
						rel="noreferrer"
					>
						docs
					</a>{' '}
					for more information.
				</p>
			</section>

			<div className="authn-provider__columns">
				{/* Left Column - Core OIDC Settings */}
				<div className="authn-provider__left">
					<div className="authn-provider__field-group">
						<label className="authn-provider__label" htmlFor="oidc-domain">
							Domain
							<Tooltip title="The email domain for users who should use SSO (e.g., `example.com` for users with `@example.com` emails)">
								<CircleHelp size={14} color={Style.L3_FOREGROUND} cursor="help" />
							</Tooltip>
						</label>
						<Form.Item
							name="name"
							className="authn-provider__form-item"
							rules={[
								{ required: true, message: 'Domain is required', whitespace: true },
							]}
						>
							<Input id="oidc-domain" disabled={!isCreate} />
						</Form.Item>
					</div>

					<div className="authn-provider__field-group">
						<label className="authn-provider__label" htmlFor="oidc-issuer">
							Issuer URL
							<Tooltip title='The URL identifier for the OIDC provider. For example: "https://accounts.google.com" or "https://login.salesforce.com".'>
								<CircleHelp size={14} color={Style.L3_FOREGROUND} cursor="help" />
							</Tooltip>
						</label>
						<Form.Item
							name={['oidcConfig', 'issuer']}
							className="authn-provider__form-item"
							rules={[
								{ required: true, message: 'Issuer URL is required', whitespace: true },
							]}
						>
							<Input id="oidc-issuer" />
						</Form.Item>
					</div>

					<div className="authn-provider__field-group">
						<label className="authn-provider__label" htmlFor="oidc-issuer-alias">
							Issuer Alias
							<Tooltip title="Optional: Override the issuer URL from .well-known/openid-configuration for providers like Azure or Oracle IDCS.">
								<CircleHelp size={14} color={Style.L3_FOREGROUND} cursor="help" />
							</Tooltip>
						</label>
						<Form.Item
							name={['oidcConfig', 'issuerAlias']}
							className="authn-provider__form-item"
						>
							<Input id="oidc-issuer-alias" />
						</Form.Item>
					</div>

					<div className="authn-provider__field-group">
						<label className="authn-provider__label" htmlFor="oidc-client-id">
							Client ID
							<Tooltip title="The application's client ID from your OIDC provider.">
								<CircleHelp size={14} color={Style.L3_FOREGROUND} cursor="help" />
							</Tooltip>
						</label>
						<Form.Item
							name={['oidcConfig', 'clientId']}
							className="authn-provider__form-item"
							rules={[
								{ required: true, message: 'Client ID is required', whitespace: true },
							]}
						>
							<Input id="oidc-client-id" />
						</Form.Item>
					</div>

					<div className="authn-provider__field-group">
						<label className="authn-provider__label" htmlFor="oidc-client-secret">
							Client Secret
							<Tooltip title="The application's client secret from your OIDC provider.">
								<CircleHelp size={14} color={Style.L3_FOREGROUND} cursor="help" />
							</Tooltip>
						</label>
						<Form.Item
							name={['oidcConfig', 'clientSecret']}
							className="authn-provider__form-item"
							rules={[
								{
									required: true,
									message: 'Client Secret is required',
									whitespace: true,
								},
							]}
						>
							<Input id="oidc-client-secret" />
						</Form.Item>
					</div>

					<div className="authn-provider__checkbox-row">
						<Form.Item
							name={['oidcConfig', 'insecureSkipEmailVerified']}
							valuePropName="checked"
							noStyle
						>
							<Checkbox
								id="oidc-skip-email-verification"
								labelName="Skip Email Verification"
								onCheckedChange={(checked: boolean): void => {
									form.setFieldValue(
										['oidcConfig', 'insecureSkipEmailVerified'],
										checked,
									);
								}}
							/>
						</Form.Item>
						<Tooltip title='Whether to skip email verification. Defaults to "false"'>
							<CircleHelp size={14} color={Style.L3_FOREGROUND} cursor="help" />
						</Tooltip>
					</div>

					<div className="authn-provider__checkbox-row">
						<Form.Item
							name={['oidcConfig', 'getUserInfo']}
							valuePropName="checked"
							noStyle
						>
							<Checkbox
								id="oidc-get-user-info"
								labelName="Get User Info"
								onCheckedChange={(checked: boolean): void => {
									form.setFieldValue(['oidcConfig', 'getUserInfo'], checked);
								}}
							/>
						</Form.Item>
						<Tooltip title="Use the userinfo endpoint to get additional claims. Useful when providers return thin ID tokens.">
							<CircleHelp size={14} color={Style.L3_FOREGROUND} cursor="help" />
						</Tooltip>
					</div>

					<Callout
						type="warning"
						size="small"
						showIcon
						description="OIDC won't be enabled unless you enter all the attributes above"
						className="callout"
					/>
				</div>

				{/* Right Column - Advanced Settings */}
				<div className="authn-provider__right">
					<ClaimMappingSection
						fieldNamePrefix={['oidcConfig', 'claimMapping']}
						isExpanded={expandedSection === 'claim-mapping'}
						onExpandChange={handleClaimMappingChange}
					/>

					<RoleMappingSection
						fieldNamePrefix={['roleMapping']}
						isExpanded={expandedSection === 'role-mapping'}
						onExpandChange={handleRoleMappingChange}
					/>
				</div>
			</div>
		</div>
	);
}

export default ConfigureOIDCAuthnProvider;
