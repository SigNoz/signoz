import { Button, Modal, Space, Typography } from 'antd';
import { ColumnsType } from 'antd/lib/table';
import deleteUser from 'api/user/deleteUser';
import editUserApi from 'api/user/editUser';
import getOrgUser from 'api/user/getOrgUser';
import updateRole from 'api/user/updateRole';
import { ResizeTable } from 'components/ResizeTable';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import dayjs from 'dayjs';
import { useNotifications } from 'hooks/useNotifications';
import { useAppContext } from 'providers/App/App';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'react-query';
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
			const response = await deleteUser({
				userId: id,
			});

			if (response.statusCode === 200) {
				onDelete();
				notifications.success({
					message: t('success', {
						ns: 'common',
					}),
				});
				setIsDeleteModalVisible(false);
			} else {
				notifications.error({
					message:
						response.error ||
						t('something_went_wrong', {
							ns: 'common',
						}),
				});
			}
			setIsDeleteLoading(false);
		} catch (error) {
			setIsDeleteLoading(false);

			notifications.error({
				message: t('something_went_wrong', {
					ns: 'common',
				}),
			});
		}
	};

	const onInviteMemberHandler = async (): Promise<void> => {
		try {
			setIsUpdateLoading(true);
			const [editUserResponse, updateRoleResponse] = await Promise.all([
				editUserApi({
					userId: id,
					name: updatedName,
				}),
				updateRole({
					group_name: role,
					userId: id,
				}),
			]);

			if (
				editUserResponse.statusCode === 200 &&
				updateRoleResponse.statusCode === 200
			) {
				onUpdateDetailsHandler();
				notifications.success({
					message: t('success', {
						ns: 'common',
					}),
				});
			} else {
				notifications.error({
					message:
						editUserResponse.error ||
						updateRoleResponse.error ||
						t('something_went_wrong', {
							ns: 'common',
						}),
				});
			}
			setIsUpdateLoading(false);
		} catch (error) {
			notifications.error({
				message: t('something_went_wrong', {
					ns: 'common',
				}),
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
						onClick={onInviteMemberHandler}
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
	const { status, data, isLoading } = useQuery({
		queryFn: () =>
			getOrgUser({
				orgId: (org || [])[0].id,
			}),
		queryKey: ['getOrgUser', org?.[0].id],
	});

	const [dataSource, setDataSource] = useState<DataType[]>([]);

	useEffect(() => {
		if (status === 'success' && data?.payload && Array.isArray(data.payload)) {
			const updatedData: DataType[] = data?.payload?.map((e) => ({
				accessLevel: e.role,
				email: e.email,
				id: String(e.id),
				joinedOn: String(e.createdAt),
				name: e.name,
			}));
			setDataSource(updatedData);
		}
	}, [data?.payload, status]);

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
						{dayjs.unix(Number(joinedOn)).format(DATE_TIME_FORMATS.MONTH_DATE_FULL)}
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
		<Space direction="vertical" size="middle">
			<Typography.Title level={3}>
				Members{' '}
				{!isLoading && dataSource && (
					<div className="members-count"> ({dataSource.length}) </div>
				)}
			</Typography.Title>
			<ResizeTable
				columns={columns}
				tableLayout="fixed"
				dataSource={dataSource}
				pagination={false}
				loading={status === 'loading'}
				bordered
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

interface UserFunctionProps extends DataType {
	setDataSource: Dispatch<SetStateAction<DataType[]>>;
}

export default Members;
