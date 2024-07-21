import { PlusOutlined } from '@ant-design/icons';
import {
	Button,
	Form,
	FormInstance,
	Input,
	Select,
	Space,
	Typography,
} from 'antd';
import { useTranslation } from 'react-i18next';
import { requireErrorMessage } from 'utils/form/requireErrorMessage';

import { InviteMemberFormValues } from '../PendingInvitesContainer/index';
import { SelectDrawer, SpaceContainer, TitleWrapper } from './styles';

function InviteTeamMembers({ form, onFinish }: Props): JSX.Element {
	const { t } = useTranslation('organizationsettings');

	return (
		<>
			<TitleWrapper>
				<Typography>{t('email_address')}</Typography>
				<Typography>{t('name_optional')}</Typography>
				<Typography>{t('role')}</Typography>
			</TitleWrapper>
			<Form
				form={form}
				onFinish={onFinish}
				initialValues={{ members: [{ email: '', name: '', role: 'VIEWER' }] }}
			>
				<Form.List name="members">
					{(fields, { add }): JSX.Element => (
						<SpaceContainer direction="vertical" align="center" size="middle">
							{fields.map(({ key, name }) => (
								<Space key={key} direction="horizontal" align="start">
									<Form.Item
										name={[name, 'email']}
										rules={[
											{
												required: true,
												message: requireErrorMessage('Email'),
												type: 'email',
											},
										]}
									>
										<Input placeholder={t('email_placeholder')} />
									</Form.Item>
									<Form.Item name={[name, 'name']}>
										<Input placeholder={t('name_placeholder')} />
									</Form.Item>
									<Form.Item name={[name, 'role']} initialValue="VIEWER">
										<SelectDrawer data-testid="role-select">
											<Select.Option value="ADMIN">ADMIN</Select.Option>
											<Select.Option value="VIEWER">VIEWER</Select.Option>
											<Select.Option value="EDITOR">EDITOR</Select.Option>
										</SelectDrawer>
									</Form.Item>
								</Space>
							))}
							<Form.Item>
								<Button onClick={add} icon={<PlusOutlined />} type="default">
									{t('add_another_team_member')}
								</Button>
							</Form.Item>
						</SpaceContainer>
					)}
				</Form.List>
			</Form>
		</>
	);
}

interface Props {
	form: FormInstance<InviteMemberFormValues>;
	onFinish: (values: InviteMemberFormValues) => Promise<void>;
}

export default InviteTeamMembers;
