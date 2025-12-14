import { PlusOutlined } from '@ant-design/icons';
import { Button, Form, Space, Typography } from 'antd';
import { ColumnsType } from 'antd/lib/table';
import get from 'api/v1/invite/get';
import deleteInvite from 'api/v1/invite/id/delete';
import ErrorContent from 'components/ErrorModal/components/ErrorContent';
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
import APIError from 'types/api/error';
import { PendingInvite } from 'types/api/user/getPendingInvites';
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

	const { data, isLoading, error, isError, refetch } = useQuery({
		queryFn: get,
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
		(payload: PendingInvite[] = []) =>
			payload?.map((data) => ({
				key: data.createdAt,
				name: data.name,
				id: data.id,
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
		if (data?.data) {
			const parsedData = getParsedInviteData(data?.data || []);
			setDataSource(parsedData);
		}
	}, [data, getParsedInviteData]);

	const onRevokeHandler = async (id: string): Promise<void> => {
		try {
			await deleteInvite({
				id,
			});
			// remove from the client data
			const index = dataSource.findIndex((e) => e.id === id);
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
		} catch (error) {
			notifications.error({
				message: (error as APIError).getErrorCode(),
				description: (error as APIError).getErrorMessage(),
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
					<Typography.Link onClick={(): Promise<void> => onRevokeHandler(record.id)}>
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
		<div className="pending-invites-container-wrapper">
			<InviteUserModal
				form={form}
				isInviteTeamMemberModalOpen={isInviteTeamMemberModalOpen}
				toggleModal={toggleModal}
				onClose={refetch}
			/>

			<div className="pending-invites-container">
				<TitleWrapper>
					<Typography.Title level={3}>
						{t('pending_invites')}
						{dataSource && (
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
				{!isError && (
					<ResizeTable
						columns={columns}
						tableLayout="fixed"
						dataSource={dataSource}
						pagination={false}
						loading={isLoading}
						bordered
					/>
				)}
				{isError && <ErrorContent error={error as APIError} />}
			</div>
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
	id: string;
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
