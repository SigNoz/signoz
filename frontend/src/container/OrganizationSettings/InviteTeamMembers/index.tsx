import { PlusOutlined } from '@ant-design/icons';
import { Button, Form, Input, Select, Space, Typography } from 'antd';
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { InviteTeamMembersProps } from '../PendingInvitesContainer/index';
import { SelectDrawer, TitleWrapper } from './styles';

const { Option } = Select;

function InviteTeamMembers({ allMembers, setAllMembers }: Props): JSX.Element {
	const { t } = useTranslation('organizationsettings');

	const onAddHandler = (): void => {
		setAllMembers((state) => [
			...state,
			{
				email: '',
				name: '',
				role: 'VIEWER',
			},
		]);
	};

	const onChangeHandler = useCallback(
		(value: string, index: number, type: string): void => {
			setAllMembers((prev) => {
				return [
					...prev.slice(0, index),
					{
						...prev[index],
						[type]: value,
					},
					...prev.slice(index, prev.length - 1),
				];
			});
		},
		[setAllMembers],
	);

	return (
		<>
			<TitleWrapper>
				<Typography>{t('email_address')}</Typography>
				<Typography>{t('name_optional')}</Typography>
				<Typography>{t('role')}</Typography>
			</TitleWrapper>
			<Form>
				<Space direction="vertical" align="center" size="middle">
					{allMembers.map((e, index) => (
						<Space key={Number(index)} direction="horizontal">
							<Input
								placeholder={t('email_placeholder')}
								value={e.email}
								onChange={(event): void => {
									onChangeHandler(event.target.value, index, 'email');
								}}
								required
							/>
							<Input
								placeholder={t('name_placeholder')}
								value={e.name}
								onChange={(event): void => {
									onChangeHandler(event.target.value, index, 'name');
								}}
								required
							/>
							<SelectDrawer
								value={e.role}
								onSelect={(value: unknown): void => {
									if (typeof value === 'string') {
										onChangeHandler(value, index, 'role');
									}
								}}
							>
								<Option value="ADMIN">ADMIN</Option>
								<Option value="VIEWER">VIEWER</Option>
								<Option value="EDITOR">EDITOR</Option>
							</SelectDrawer>
						</Space>
					))}
					<Button onClick={onAddHandler} icon={<PlusOutlined />} type="default">
						{t('add_another_team_member')}
					</Button>
				</Space>
			</Form>
		</>
	);
}

interface Props {
	allMembers: InviteTeamMembersProps[];
	setAllMembers: React.Dispatch<React.SetStateAction<InviteTeamMembersProps[]>>;
}

export default InviteTeamMembers;
