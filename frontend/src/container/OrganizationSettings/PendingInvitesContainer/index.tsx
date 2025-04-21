import { PlusOutlined } from '@ant-design/icons';
import { Button, Form, Space, Typography } from 'antd';
import { ColumnsType } from 'antd/lib/table';
import deleteInvite from 'api/user/deleteInvite';
import getPendingInvites from 'api/user/getPendingInvites';
import { ResizeTable } from 'components/ResizeTable';
import { INVITE_MEMBERS_HASH } from 'constants/app';
import ROUTES from 'constants/routes';
import { useNotifications } from 'hooks/useNotifications';
import { useAppContext } from 'providers/App/App';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'react-query';
import { useLocation } from 'react-router-dom';
import { useCopyToClipboard } from 'react-use';
import { PayloadProps } from 'types/api/user/getPendingInvites';
import { ROLES } from 'types/roles';

import InviteUserModal from '../InviteUserModal/InviteUserModal';
import { TitleWrapper } from './styles';

function PendingInvitesContainer(): JSX.Element {
	const [
		isInviteTeamMemberModalOpen,
		setIsInviteTeamMemberModalOpen,
	] = useState<boolean>(false);
	const [form] = Form.useForm<InviteMemberFormValues>();
	const { t } = useTranslation(['organizationsettings', 'common']);
	const [state, setText] = useCopyToClipboard();
	const { notifications } = useNotifications();
	const { user } = useAppContext();

	useEffect(() => {
		if (state.error) {
			notifications.error({
				message: state.error.message,
			});
		}

		if (state.value) {
			notifications.success({
				message: t('success', {
					ns: 'common',
				}),
			});
		}
	}, [state.error, state.value, t, notifications]);

	const getPendingInvitesResponse = useQuery({
		queryFn: getPendingInvites,
		queryKey: ['getPendingInvites', user?.accessJwt],
	});

	const [dataSource, setDataSource] = useState<DataProps[]>([]);

	const toggleModal = useCallback(
		(value: boolean): void => {
			setIsInviteTeamMemberModalOpen(value);
			if (!value) {
				form.resetFields();
			}
		},
		[form],
	);

	const { hash } = useLocation();

	const getParsedInviteData = useCallback(
		(payload: PayloadProps = []) =>
			payload?.map((data) => ({
				key: data.createdAt,
				name: data.name,
				email: data.email,
				accessLevel: data.role,
				inviteLink: `${window.location.origin}${ROUTES.SIGN_UP}?token=${data.token}`,
			})),
		[],
	);

	useEffect(() => {
		if (hash === INVITE_MEMBERS_HASH) {
			toggleModal(true);
		}
	}, [hash, toggleModal]);

	useEffect(() => {
		if (
			getPendingInvitesResponse.status === 'success' &&
			getPendingInvitesResponse?.data?.payload
		) {
			const data = getParsedInviteData(
				getPendingInvitesResponse?.data?.payload || [],
			);
			setDataSource(data);
		}
	}, [
		getParsedInviteData,
		getPendingInvitesResponse?.data?.payload,
		getPendingInvitesResponse.status,
	]);

	const onRevokeHandler = async (email: string): Promise<void> => {
		try {
			const response = await deleteInvite({
				email,
			});
			if (response.statusCode === 200) {
				// remove from the client data
				const index = dataSource.findIndex((e) => e.email === email);

				if (index !== -1) {
					setDataSource([
						...dataSource.slice(0, index),
						...dataSource.slice(index + 1, dataSource.length),
					]);
				}
				notifications.success({
					message: t('success', {
						ns: 'common',
					}),
				});
			} else {
				notifications.error({
					message:
						response.error ||
						t('something_went_wrong', {
							ns: 'common',
						}),
				});
			}
		} catch (error) {
			notifications.error({
				message: t('something_went_wrong', {
					ns: 'common',
				}),
			});
		}
	};

	const columns: ColumnsType<DataProps> = [
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
			width: 80,
		},
		{
			title: 'Access Level',
			dataIndex: 'accessLevel',
			key: 'accessLevel',
			width: 50,
		},
		{
			title: 'Invite Link',
			dataIndex: 'inviteLink',
			key: 'Invite Link',
			ellipsis: true,
			width: 100,
		},
		{
			title: 'Action',
			dataIndex: 'action',
			width: 80,
			key: 'Action',
			render: (_, record): JSX.Element => (
				<Space direction="horizontal">
					<Typography.Link
						onClick={(): Promise<void> => onRevokeHandler(record.email)}
					>
						Revoke
					</Typography.Link>
					<Typography.Link
						onClick={(): void => {
							setText(record.inviteLink);
						}}
					>
						Copy Invite Link
					</Typography.Link>
				</Space>
			),
		},
	];

	return (
		<div>
			<InviteUserModal
				form={form}
				isInviteTeamMemberModalOpen={isInviteTeamMemberModalOpen}
				setDataSource={setDataSource}
				toggleModal={toggleModal}
				shouldCallApi
			/>

			<Space direction="vertical" size="middle">
				<TitleWrapper>
					<Typography.Title level={3}>
						{t('pending_invites')}
						{getPendingInvitesResponse.status !== 'loading' && dataSource && (
							<div className="members-count"> ({dataSource.length})</div>
						)}
					</Typography.Title>

					<Space>
						<Button
							icon={<PlusOutlined />}
							type="primary"
							onClick={(): void => {
								toggleModal(true);
							}}
						>
							{t('invite_members')}
						</Button>
					</Space>
				</TitleWrapper>
				<ResizeTable
					columns={columns}
					tableLayout="fixed"
					dataSource={dataSource}
					pagination={false}
					loading={getPendingInvitesResponse.status === 'loading'}
					bordered
				/>
			</Space>
		</div>
	);
}

export interface InviteTeamMembersProps {
	email: string;
	name: string;
	role: string;
	id: string;
	frontendBaseUrl: string;
}

interface DataProps {
	key: number;
	name: string;
	email: string;
	accessLevel: ROLES;
	inviteLink: string;
}

type Role = 'ADMIN' | 'VIEWER' | 'EDITOR';

export interface InviteMemberFormValues {
	members: {
		email: string;
		name: string;
		role: Role;
	}[];
}

export default PendingInvitesContainer;
