import './Providers.styles.scss';

import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { Callout } from '@signozhq/callout';
import {
	Button,
	Checkbox,
	Collapse,
	Form,
	Input,
	Select,
	Space,
	Typography,
} from 'antd';

import RoleMappingSection from './RoleMappingSection';

function ConfigureGoogleAuthAuthnProvider({
	isCreate,
}: {
	isCreate: boolean;
}): JSX.Element {
	const fetchGroups = Form.useWatch(['googleAuthConfig', 'fetchGroups']);

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

			<Form.Item
				label="Skip Email Verification"
				name={['googleAuthConfig', 'insecureSkipEmailVerified']}
				valuePropName="checked"
				className="field"
				tooltip={{
					title: `Whether to skip email verification. Defaults to "false"`,
				}}
			>
				<Checkbox />
			</Form.Item>

			<Collapse
				ghost
				items={[
					{
						key: 'groupFetching',
						label: (
							<Typography.Text strong>
								Google Workspace Groups (Advanced)
							</Typography.Text>
						),
						children: (
							<>
								<Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
									Enable group fetching to retrieve user groups from Google Workspace.
									This requires a Google Service Account with domain-wide delegation and
									the Admin SDK Directory API enabled.
								</Typography.Paragraph>

								<Form.Item
									label="Fetch Groups"
									name={['googleAuthConfig', 'fetchGroups']}
									valuePropName="checked"
									className="field"
									tooltip={{
										title: `Enable fetching Google Workspace groups for the user. Requires service account configuration.`,
									}}
								>
									<Checkbox />
								</Form.Item>

								{fetchGroups && (
									<>
										<Form.Item
											label="Service Account JSON"
											name={['googleAuthConfig', 'serviceAccountJson']}
											tooltip={{
												title: `The JSON content of the Google Service Account credentials file. Required for group fetching.`,
											}}
											rules={[
												{
													required: fetchGroups,
													message:
														'Service Account JSON is required when Fetch Groups is enabled',
												},
											]}
										>
											<Input.TextArea
												rows={4}
												placeholder='{"type": "service_account", ...}'
											/>
										</Form.Item>

										<Typography.Text
											strong
											style={{ display: 'block', marginBottom: 8, marginTop: 16 }}
										>
											Domain to Admin Email Mapping
										</Typography.Text>
										<Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
											Map workspace domains to admin emails for service account
											impersonation. Use &quot;*&quot; as a wildcard for any domain.
										</Typography.Paragraph>

										<Form.List name={['googleAuthConfig', 'domainToAdminEmailList']}>
											{(fields, { add, remove }): JSX.Element => (
												<>
													{fields.map(({ key, name, ...restField }) => (
														<Space
															key={key}
															style={{ display: 'flex', marginBottom: 8 }}
															align="baseline"
														>
															<Form.Item
																{...restField}
																name={[name, 'domain']}
																rules={[{ required: true, message: 'Domain required' }]}
															>
																<Input
																	placeholder="Domain (e.g., example.com or *)"
																	style={{ width: 180 }}
																/>
															</Form.Item>
															<Form.Item
																{...restField}
																name={[name, 'adminEmail']}
																rules={[
																	{ required: true, message: 'Admin email required' },
																	{ type: 'email', message: 'Must be a valid email' },
																]}
															>
																<Input placeholder="Admin Email" style={{ width: 200 }} />
															</Form.Item>
															<MinusCircleOutlined onClick={(): void => remove(name)} />
														</Space>
													))}
													<Form.Item>
														<Button
															type="dashed"
															onClick={(): void => add()}
															block
															icon={<PlusOutlined />}
														>
															Add Domain Mapping
														</Button>
													</Form.Item>
												</>
											)}
										</Form.List>

										<Form.Item
											label="Fetch Transitive Group Membership"
											name={['googleAuthConfig', 'fetchTransitiveGroupMembership']}
											valuePropName="checked"
											className="field"
											tooltip={{
												title: `If enabled, recursively fetch groups that contain other groups (transitive membership).`,
											}}
										>
											<Checkbox />
										</Form.Item>

										<Form.Item
											label="Allowed Groups"
											name={['googleAuthConfig', 'allowedGroupsList']}
											tooltip={{
												title: `Optional list of allowed groups. If configured, only users belonging to one of these groups will be allowed to login.`,
											}}
										>
											<Select
												mode="tags"
												placeholder="Enter group emails and press Enter"
												style={{ width: '100%' }}
												tokenSeparators={[',']}
											/>
										</Form.Item>
									</>
								)}
							</>
						),
					},
				]}
			/>

			<RoleMappingSection />

			<Callout
				type="warning"
				size="small"
				showIcon
				description="Google OAuth2 won't be enabled unless you enter all the required attributes above"
				className="callout"
			/>
		</div>
	);
}

export default ConfigureGoogleAuthAuthnProvider;
