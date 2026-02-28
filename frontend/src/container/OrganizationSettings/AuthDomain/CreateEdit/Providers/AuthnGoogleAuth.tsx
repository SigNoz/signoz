import { useCallback, useState } from 'react';
import { Callout } from '@signozhq/callout';
import { Checkbox } from '@signozhq/checkbox';
import { Color, Style } from '@signozhq/design-tokens';
import {
	ChevronDown,
	ChevronRight,
	CircleHelp,
	TriangleAlert,
} from '@signozhq/icons';
import { Input } from '@signozhq/input';
import { Collapse, Form, Tooltip } from 'antd';
import TextArea from 'antd/lib/input/TextArea';
import { useCollapseSectionErrors } from 'hooks/useCollapseSectionErrors';

import DomainMappingList from './components/DomainMappingList';
import EmailTagInput from './components/EmailTagInput';
import RoleMappingSection from './components/RoleMappingSection';

import './Providers.styles.scss';

type ExpandedSection = 'workspace-groups' | 'role-mapping' | null;

function ConfigureGoogleAuthAuthnProvider({
	isCreate,
}: {
	isCreate: boolean;
}): JSX.Element {
	const form = Form.useFormInstance();
	const fetchGroups = Form.useWatch(['googleAuthConfig', 'fetchGroups'], form);

	const [expandedSection, setExpandedSection] = useState<ExpandedSection>(null);

	const handleWorkspaceGroupsChange = useCallback(
		(keys: string | string[]): void => {
			const isExpanding = Array.isArray(keys) ? keys.length > 0 : !!keys;
			setExpandedSection(isExpanding ? 'workspace-groups' : null);
		},
		[],
	);

	const handleRoleMappingChange = useCallback((expanded: boolean): void => {
		setExpandedSection(expanded ? 'role-mapping' : null);
	}, []);

	const {
		hasErrors: hasWorkspaceGroupsErrors,
		errorMessages: workspaceGroupsErrorMessages,
	} = useCollapseSectionErrors(
		['googleAuthConfig'],
		[
			['googleAuthConfig', 'fetchGroups'],
			['googleAuthConfig', 'serviceAccountJson'],
			['googleAuthConfig', 'domainToAdminEmailList'],
			['googleAuthConfig', 'fetchTransitiveGroupMembership'],
			['googleAuthConfig', 'allowedGroups'],
		],
	);

	return (
		<div className="authn-provider">
			<section className="authn-provider__header">
				<h3 className="authn-provider__title">Edit Google Authentication</h3>
				<p className="authn-provider__description">
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
				</p>
			</section>

			<div className="authn-provider__columns">
				{/* Left Column - Core OAuth Settings */}
				<div className="authn-provider__left">
					<div className="authn-provider__field-group">
						<label className="authn-provider__label" htmlFor="google-domain">
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
							<Input id="google-domain" disabled={!isCreate} />
						</Form.Item>
					</div>

					<div className="authn-provider__field-group">
						<label className="authn-provider__label" htmlFor="google-client-id">
							Client ID
							<Tooltip title="ClientID is the application's ID. For example, 292085223830.apps.googleusercontent.com.">
								<CircleHelp size={14} color={Style.L3_FOREGROUND} cursor="help" />
							</Tooltip>
						</label>
						<Form.Item
							name={['googleAuthConfig', 'clientId']}
							className="authn-provider__form-item"
							rules={[
								{ required: true, message: 'Client ID is required', whitespace: true },
							]}
						>
							<Input id="google-client-id" />
						</Form.Item>
					</div>

					<div className="authn-provider__field-group">
						<label className="authn-provider__label" htmlFor="google-client-secret">
							Client Secret
							<Tooltip title="It is the application's secret.">
								<CircleHelp size={14} color={Style.L3_FOREGROUND} cursor="help" />
							</Tooltip>
						</label>
						<Form.Item
							name={['googleAuthConfig', 'clientSecret']}
							className="authn-provider__form-item"
							rules={[
								{
									required: true,
									message: 'Client Secret is required',
									whitespace: true,
								},
							]}
						>
							<Input id="google-client-secret" />
						</Form.Item>
					</div>

					<div className="authn-provider__checkbox-row">
						<Form.Item
							name={['googleAuthConfig', 'insecureSkipEmailVerified']}
							valuePropName="checked"
							noStyle
						>
							<Checkbox
								id="google-skip-email-verification"
								labelName="Skip Email Verification"
								onCheckedChange={(checked: boolean): void => {
									form.setFieldValue(
										['googleAuthConfig', 'insecureSkipEmailVerified'],
										checked,
									);
								}}
							/>
						</Form.Item>
						<Tooltip title='Whether to skip email verification. Defaults to "false"'>
							<CircleHelp size={14} color={Style.L3_FOREGROUND} cursor="help" />
						</Tooltip>
					</div>

					<Callout
						type="warning"
						size="small"
						showIcon
						description="Google OAuth2 won't be enabled unless you enter all the attributes above"
						className="callout"
					/>
				</div>

				{/* Right Column - Google Workspace Groups (Advanced) */}
				<div className="authn-provider__right">
					<Collapse
						bordered={false}
						activeKey={
							expandedSection === 'workspace-groups' ? ['workspace-groups'] : []
						}
						onChange={handleWorkspaceGroupsChange}
						className="authn-provider__collapse"
						expandIcon={(): null => null}
					>
						<Collapse.Panel
							key="workspace-groups"
							header={
								<div className="authn-provider__collapse-header">
									{expandedSection !== 'workspace-groups' ? (
										<ChevronRight size={16} />
									) : (
										<ChevronDown size={16} />
									)}
									<div className="authn-provider__collapse-header-text">
										<h4 className="authn-provider__section-title">
											Google Workspace Groups (Advanced)
										</h4>
										<p className="authn-provider__section-description">
											Enable group fetching to retrieve user groups from Google Workspace.
											Requires a Service Account with domain-wide delegation.
										</p>
									</div>
									{expandedSection !== 'workspace-groups' && hasWorkspaceGroupsErrors && (
										<Tooltip
											title={
												<div>
													{workspaceGroupsErrorMessages.map((msg) => (
														<div key={msg}>{msg}</div>
													))}
												</div>
											}
										>
											<TriangleAlert size={16} color={Color.BG_CHERRY_500} />
										</Tooltip>
									)}
								</div>
							}
						>
							<div className="authn-provider__group-content">
								<div className="authn-provider__checkbox-row">
									<Form.Item
										name={['googleAuthConfig', 'fetchGroups']}
										valuePropName="checked"
										noStyle
									>
										<Checkbox
											id="google-fetch-groups"
											labelName="Fetch Groups"
											onCheckedChange={(checked: boolean): void => {
												form.setFieldValue(['googleAuthConfig', 'fetchGroups'], checked);
											}}
										/>
									</Form.Item>
									<Tooltip title="Enable fetching Google Workspace groups for the user. Requires service account configuration.">
										<CircleHelp size={14} color={Style.L3_FOREGROUND} cursor="help" />
									</Tooltip>
								</div>

								{fetchGroups && (
									<div className="authn-provider__group-fields">
										<div className="authn-provider__field-group">
											<label
												className="authn-provider__label"
												htmlFor="google-service-account-json"
											>
												Service Account JSON
												<Tooltip title="The JSON content of the Google Service Account credentials file. Required for group fetching.">
													<CircleHelp size={14} color={Style.L3_FOREGROUND} cursor="help" />
												</Tooltip>
											</label>
											<Form.Item
												name={['googleAuthConfig', 'serviceAccountJson']}
												className="authn-provider__form-item"
											>
												<TextArea
													id="google-service-account-json"
													rows={3}
													placeholder="Paste service account JSON"
													className="authn-provider__textarea"
												/>
											</Form.Item>
										</div>

										<DomainMappingList
											fieldNamePrefix={['googleAuthConfig', 'domainToAdminEmailList']}
										/>

										<div className="authn-provider__checkbox-row">
											<Form.Item
												name={['googleAuthConfig', 'fetchTransitiveGroupMembership']}
												valuePropName="checked"
												noStyle
											>
												<Checkbox
													id="google-transitive-membership"
													labelName="Fetch Transitive Group Membership"
													onCheckedChange={(checked: boolean): void => {
														form.setFieldValue(
															['googleAuthConfig', 'fetchTransitiveGroupMembership'],
															checked,
														);
													}}
												/>
											</Form.Item>
											<Tooltip title="If enabled, recursively fetch groups that contain other groups (transitive membership).">
												<CircleHelp size={14} color={Style.L3_FOREGROUND} cursor="help" />
											</Tooltip>
										</div>

										<div className="authn-provider__field-group">
											<label
												className="authn-provider__label"
												htmlFor="google-allowed-groups"
											>
												Allowed Groups
												<Tooltip title="Optional list of allowed groups. If configured, only users belonging to one of these groups will be allowed to login.">
													<CircleHelp size={14} color={Style.L3_FOREGROUND} cursor="help" />
												</Tooltip>
											</label>
											<Form.Item
												name={['googleAuthConfig', 'allowedGroups']}
												className="authn-provider__form-item"
											>
												<EmailTagInput placeholder="Type a group email and press Enter" />
											</Form.Item>
										</div>
									</div>
								)}
							</div>
						</Collapse.Panel>
					</Collapse>

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

export default ConfigureGoogleAuthAuthnProvider;
