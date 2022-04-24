import { Button, Modal, Space, Typography } from 'antd';
import Table, { ColumnsType } from 'antd/lib/table';
import React, { useState } from 'react';
import { ROLES } from 'types/roles';

import DeleteMembersDetails from '../DeleteMembersDetails';
import EditMembersDetails from '../EditMembersDetails';

function UserFunction({ id }: DataType): JSX.Element {
	console.log(id);
	const [isModalVisible, setIsModalVisible] = useState(false);
	const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

	const onModalToggleHandler = (
		func: React.Dispatch<React.SetStateAction<boolean>>,
		value: boolean,
	): void => {
		func(value);
	};

	const [emailAddress, setEmailAddress] = useState('');
	const [name, setName] = useState('');
	const [role, setRole] = useState<ROLES>('EDITOR');

	const onUpdateDetailsHandler = (): void => {
		console.log('update');
	};

	return (
		<>
			<Space direction="horizontal">
				<Typography.Link
					onClick={(): void => onModalToggleHandler(setIsModalVisible, true)}
				>
					Edit
				</Typography.Link>
				<Typography.Link
					onClick={(): void => onModalToggleHandler(setIsDeleteModalVisible, true)}
				>
					Delete
				</Typography.Link>
			</Space>
			<Modal
				title="Edit member details"
				visible={isModalVisible}
				onOk={(): void => onModalToggleHandler(setIsModalVisible, false)}
				onCancel={(): void => onModalToggleHandler(setIsModalVisible, false)}
				centered
				footer={[
					<Button
						key="back"
						onClick={(): void => onModalToggleHandler(setIsModalVisible, false)}
						type="default"
					>
						Cancel
					</Button>,
					<Button
						key="Invite_team_members"
						onClick={onUpdateDetailsHandler}
						type="primary"
					>
						Update Details
					</Button>,
				]}
			>
				<EditMembersDetails
					{...{
						emailAddress,
						name,
						role,
						setEmailAddress,
						setName,
						setRole,
					}}
				/>
			</Modal>
			<Modal
				title="Edit member details"
				visible={isDeleteModalVisible}
				onOk={(): void => onModalToggleHandler(setIsDeleteModalVisible, false)}
				onCancel={(): void => onModalToggleHandler(setIsDeleteModalVisible, false)}
				centered
			>
				<DeleteMembersDetails />
			</Modal>
		</>
	);
}

function Members(): JSX.Element {
	const dataSource: DataType[] = [
		{
			id: '1',
			name: 'Pranay Prateek',
			email: 'pranay@signoz.io',
			accessLevel: 'ADMIN',
			joinedOn: 'March 12, 2021',
		},
	];

	const columns: ColumnsType<DataType> = [
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
			title: 'Joined On',
			dataIndex: 'joinedOn',
			key: 'joinedOn',
		},
		{
			title: 'Action',
			dataIndex: 'action',
			render: (_, record): JSX.Element => (
				<UserFunction
					{...{
						accessLevel: record.accessLevel,
						email: record.email,
						joinedOn: record.joinedOn,
						name: record.name,
						id: record.id,
					}}
				/>
			),
		},
	];

	return (
		<Space direction="vertical" size="middle">
			<Typography.Title level={3}>Members</Typography.Title>
			<Table
				tableLayout="fixed"
				dataSource={dataSource}
				columns={columns}
				pagination={false}
			/>
		</Space>
	);
}

interface DataType {
	id: string;
	name: string;
	email: string;
	accessLevel: ROLES;
	joinedOn: string;
}

export default Members;
