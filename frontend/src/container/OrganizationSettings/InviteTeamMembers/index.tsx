import { PlusOutlined } from '@ant-design/icons';
import { Button, Form, Input, Select, Space, Typography } from 'antd';
import React, { useCallback } from 'react';

import { InviteTeamMembersProps } from '../PendingInvitesContainer/index';
import { SelectDrawer, TitleWrapper } from './styles';

function InviteTeamMembers({ allMembers, setAllMembers }: Props): JSX.Element {
	const { Option } = Select;

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
				<Typography>Email address</Typography>
				<Typography>Name (optional)</Typography>
				<Typography>Role</Typography>
			</TitleWrapper>
			<Form>
				<Space direction="vertical" align="center" size="middle">
					{allMembers.map((e, index) => (
						<Space key={Number(index)} direction="horizontal">
							<Input
								placeholder="john@signoz.io"
								value={e.email}
								onChange={(event): void => {
									onChangeHandler(event.target.value, index, 'email');
								}}
								key={`email-${index.toString()}`}
								required
							/>
							<Input
								placeholder="john@signoz.io"
								value={e.name}
								onChange={(event): void => {
									onChangeHandler(event.target.value, index, 'name');
								}}
								key={`name-${index.toString()}`}
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
						Add another team member
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
