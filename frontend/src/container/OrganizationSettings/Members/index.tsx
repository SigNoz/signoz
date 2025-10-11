import { Button, Modal, Space, Typography } from 'antd';
import { ColumnsType } from 'antd/lib/table';
import getAll from 'api/v1/user/get';
import deleteUser from 'api/v1/user/id/delete';
import update from 'api/v1/user/id/update';
import ErrorContent from 'components/ErrorModal/components/ErrorContent';
import { ResizeTable } from 'components/ResizeTable';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import dayjs from 'dayjs';
import { useNotifications } from 'hooks/useNotifications';
import { useAppContext } from 'providers/App/App';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'react-query';
import APIError from 'types/api/error';
import { ROLES } from 'types/roles';

import DeleteMembersDetails from '../DeleteMembersDetails';
import EditMembersDetails from '../EditMembersDetails';

function UserFunction({
	setDataSource,
	accessLevel,
	name,
	email,
	id,
}: UserFunctionProps): JSX.Element {
	const [isModalVisible, setIsModalVisible] = useState(false);
	const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

	const onModalToggleHandler = (
		func: Dispatch<SetStateAction<boolean>>,
		value: boolean,
	): void => {
		func(value);
	};

	const [emailAddress, setEmailAddress] = useState(email);
	const [updatedName, setUpdatedName] = useState(name);
	const [role, setRole] = useState<ROLES>(accessLevel);
	const { t } = useTranslation(['common']);
	const [isDeleteLoading, setIsDeleteLoading] = useState<boolean>(false);
	const [isUpdateLoading, setIsUpdateLoading] = useState<boolean>(false);
	const { notifications } = useNotifications();

	const onUpdateDetailsHandler = (): void => {
		setDataSource((data) => {
			const index = data.findIndex((e) => e.id === id);
			if (index !== -1) {
				const current = data[index];

				const updatedData: DataType[] = [
					...data.slice(0, index),
					{
						...current,
						name: updatedName,
						accessLevel: role,
						email: emailAddress,
					},
					...data.slice(index + 1, data.length),
				];

				return updatedData;
			}
			return data;
		});
	};

	const onDelete = (): void => {
		setDataSource((source) => {
			const index = source.findIndex((e) => e.id === id);

			if (index !== -1) {
				const updatedData: DataType[] = [
					...source.slice(0, index),
					...source.slice(index + 1, source.length),
				];

				return updatedData;
			}
			return source;
		});
	};

	const onDeleteHandler = async (): Promise<void> => {
		try {
			setIsDeleteLoading(true);
			await deleteUser({
				userId: id,
			});
			onDelete();
			notifications.success({
				message: t('success', {
					ns: 'common',
				}),
			});
			setIsDeleteModalVisible(false);
			setIsDeleteLoading(false);
		} catch (error) {
			setIsDeleteLoading(false);
			notifications.error({
				message: (error as APIError).getErrorCode(),
				description: (error as APIError).getErrorMessage(),
			});
		}
	};

	const onEditMemberDetails = async (): Promise<void> => {
		try {
			setIsUpdateLoading(true);
			await update({
				userId: id,
				displayName: updatedName,
				role,
			});
			onUpdateDetailsHandler();

			if (role !== accessLevel) {
				notifications.success({
					message: 'User details updated successfully',
					description:
						'The user details have been updated successfully. Please request the user to logout and login again to access the platform with updated privileges.',
				});
			} else {
				notifications.success({
					message: t('success', {
						ns: 'common',
					}),
				});
			}

			setIsUpdateLoading(false);
			setIsModalVisible(false);
		} catch (error) {
			notifications.error({
				message: (error as APIError).getErrorCode(),
				description: (error as APIError).getErrorMessage(),
			});
			setIsUpdateLoading(false);
		}
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
				className="edit-member-details-modal"
				open={isModalVisible}
				onOk={(): void => onModalToggleHandler(setIsModalVisible, false)}
				onCancel={(): void => onModalToggleHandler(setIsModalVisible, false)}
				centered
				destroyOnClose
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
						onClick={onEditMemberDetails}
						type="primary"
						disabled={isUpdateLoading}
						loading={isUpdateLoading}
					>
						Update Details
					</Button>,
				]}
			>
				<EditMembersDetails
					{...{
						emailAddress,
						name: updatedName,
						role,
						setEmailAddress,
						setName: setUpdatedName,
						setRole,
						id,
					}}
				/>
			</Modal>
			<Modal
				title="Edit member details"
				open={isDeleteModalVisible}
				onOk={onDeleteHandler}
				onCancel={(): void => onModalToggleHandler(setIsDeleteModalVisible, false)}
				centered
				confirmLoading={isDeleteLoading}
			>
				<DeleteMembersDetails name={name} />
			</Modal>
		</>
	);
}

function Members(): JSX.Element {
	const { org } = useAppContext();

	const { data, isLoading, error } = useQuery({
		queryFn: () => getAll(),
		queryKey: ['getOrgUser', org?.[0].id],
	});

	const [dataSource, setDataSource] = useState<DataType[]>([]);

	useEffect(() => {
		if (data?.data && Array.isArray(data.data)) {
			const updatedData: DataType[] = data?.data?.map((e) => ({
				accessLevel: e.role,
				email: e.email,
				id: String(e.id),
				joinedOn: String(e.createdAt),
				name: e.displayName,
			}));
			setDataSource(updatedData);
		}
	}, [data]);

	const columns: ColumnsType<DataType> = [
		{
			title: 'Name',
			dataIndex: 'name',
			key: 'name',
			width: 100,
		},
		{
			title: 'Emails',
			dataIndex: 'email',
			key: 'email',
			width: 100,
		},
		{
			title: 'Access Level',
			dataIndex: 'accessLevel',
			key: 'accessLevel',
			width: 50,
		},
		{
			title: 'Joined On',
			dataIndex: 'joinedOn',
			key: 'joinedOn',
			width: 60,
			render: (_, record): JSX.Element => {
				const { joinedOn } = record;
				return (
					<Typography>
						{dayjs(joinedOn).format(DATE_TIME_FORMATS.MONTH_DATE_FULL)}
					</Typography>
				);
			},
		},
		{
			title: 'Action',
			dataIndex: 'action',
			width: 80,
			render: (_, record): JSX.Element => (
				<UserFunction
					{...{
						accessLevel: record.accessLevel,
						email: record.email,
						joinedOn: record.joinedOn,
						name: record.name,
						id: record.id,
						setDataSource,
					}}
				/>
			),
		},
	];

	return (
		<div className="members-container">
			<Typography.Title level={3}>
				Members{' '}
				{!isLoading && dataSource && (
					<div className="members-count"> ({dataSource.length}) </div>
				)}
			</Typography.Title>
			{!(error as APIError) && (
				<ResizeTable
					columns={columns}
					tableLayout="fixed"
					dataSource={dataSource}
					pagination={false}
					loading={isLoading}
					bordered
				/>
			)}
			{(error as APIError) && <ErrorContent error={error as APIError} />}
		</div>
	);
}

interface DataType {
	id: string;
	name: string;
	email: string;
	accessLevel: ROLES;
	joinedOn: string;
}

interface UserFunctionProps extends DataType {
	setDataSource: Dispatch<SetStateAction<DataType[]>>;
}

export default Members;
