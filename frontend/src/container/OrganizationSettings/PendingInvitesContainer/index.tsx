import { PlusOutlined } from '@ant-design/icons';
import { Button, Modal, Space, Table, Typography } from 'antd';
import React, { useState } from 'react';
import { ROLES } from 'types/roles';

import InviteTeamMembers from '../InviteTeamMembers';
import { TitleWrapper } from './styles';

function PendingInvitesContainer(): JSX.Element {
	const [isModalVisible, setIsModalVisible] = useState(false);

	const showModal = (): void => {
		setIsModalVisible(true);
	};

	const handleOk = (): void => {
		setIsModalVisible(false);
	};

	const handleCancel = (): void => {
		setIsModalVisible(false);
	};

	const [allMembers, setAllMembers] = useState<InviteTeamMembersProps[]>([
		{
			email: '',
			name: '',
			role: 'VIEWER',
		},
	]);

	const dataSource = [
		{
			key: '1',
			name: 'Ankit Nayan',
			email: 'pranay@signoz.io',
			accessLevel: 'Admin',
			inviteLink: 'https://ph.com/sfjl34',
			action: (
				<Space direction="horizontal">
					<Typography.Link>Revoke</Typography.Link>
					<Typography.Link>Copy Invite Link</Typography.Link>
				</Space>
			),
		},
	];

	const columns = [
		{
			title: 'Name',
			dataIndex: 'name',
			key: 'name',
		},
		{
			title: 'Emails',
			dataIndex: 'email',
			key: 'email',
		},
		{
			title: 'Access Level',
			dataIndex: 'accessLevel',
			key: 'accessLevel',
		},
		{
			title: 'Invite Link',
			dataIndex: 'inviteLink',
			key: 'Invite Link',
		},
		{
			title: 'Action',
			dataIndex: 'action',
			key: 'Action',
		},
	];

	return (
		<div>
			<Modal
				title="Invite team members"
				visible={isModalVisible}
				onOk={handleOk}
				onCancel={handleCancel}
				centered
				footer={[
					<Button key="back" onClick={handleCancel} type="default">
						Cancel
					</Button>,
					<Button key="Invite_team_members" onClick={handleOk} type="primary">
						Invite team members
					</Button>,
				]}
			>
				<InviteTeamMembers allMembers={allMembers} setAllMembers={setAllMembers} />
			</Modal>

			<Space direction="vertical" size="middle">
				<TitleWrapper>
					<Typography.Title level={3}>Pending Invites</Typography.Title>
					<Button icon={<PlusOutlined />} type="primary" onClick={showModal}>
						Invite Members
					</Button>
				</TitleWrapper>
				<Table
					tableLayout="fixed"
					dataSource={dataSource}
					columns={columns}
					pagination={false}
				/>
			</Space>
		</div>
	);
}

export interface InviteTeamMembersProps {
	email: string;
	name: string;
	role: ROLES;
}

export default PendingInvitesContainer;
