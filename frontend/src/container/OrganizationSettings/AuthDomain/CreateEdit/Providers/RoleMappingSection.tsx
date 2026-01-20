import './Providers.styles.scss';

import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
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

const ROLE_OPTIONS = [
	{ label: 'Viewer', value: 'VIEWER' },
	{ label: 'Editor', value: 'EDITOR' },
	{ label: 'Admin', value: 'ADMIN' },
];

function RoleMappingSection(): JSX.Element {
	return (
		<Collapse
			ghost
			items={[
				{
					key: 'roleMapping',
					label: <Typography.Text strong>Role Mapping (Advanced)</Typography.Text>,
					children: (
						<>
							<Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
								Configure how user roles are determined from your Identity Provider. You
								can either use a direct role attribute or map IDP groups to SigNoz
								roles.
							</Typography.Paragraph>

							<Form.Item
								label="Default Role"
								name={['roleMapping', 'defaultRole']}
								tooltip={{
									title: `The default role assigned to new SSO users if no other role mapping applies. Default: "VIEWER"`,
								}}
							>
								<Select placeholder="VIEWER" options={ROLE_OPTIONS} allowClear />
							</Form.Item>

							<Form.Item
								label="Use Role Attribute Directly"
								name={['roleMapping', 'useRoleAttribute']}
								valuePropName="checked"
								className="field"
								tooltip={{
									title: `If enabled, the role claim/attribute from the IDP will be used directly instead of group mappings. The role value must match a SigNoz role (VIEWER, EDITOR, or ADMIN).`,
								}}
							>
								<Checkbox />
							</Form.Item>

							<Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
								Group to Role Mappings
							</Typography.Text>
							<Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
								Map IDP group names to SigNoz roles. If a user belongs to multiple
								groups, the highest privilege role will be assigned.
							</Typography.Paragraph>

							<Form.List name={['roleMapping', 'groupMappingsList']}>
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
													name={[name, 'group']}
													rules={[{ required: true, message: 'Group name required' }]}
												>
													<Input placeholder="IDP Group Name" style={{ width: 200 }} />
												</Form.Item>
												<Form.Item
													{...restField}
													name={[name, 'role']}
													rules={[{ required: true, message: 'Role required' }]}
												>
													<Select
														placeholder="SigNoz Role"
														options={ROLE_OPTIONS}
														style={{ width: 120 }}
													/>
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
												Add Group Mapping
											</Button>
										</Form.Item>
									</>
								)}
							</Form.List>
						</>
					),
				},
			]}
		/>
	);
}

export default RoleMappingSection;
