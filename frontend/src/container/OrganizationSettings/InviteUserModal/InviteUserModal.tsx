import { Button, Form, Modal } from 'antd';
import { FormInstance } from 'antd/lib';
import sendInvite from 'api/v1/invite/create';
import get from 'api/v1/invite/get';
import ROUTES from 'constants/routes';
import { useNotifications } from 'hooks/useNotifications';
import { useAppContext } from 'providers/App/App';
import {
	Dispatch,
	SetStateAction,
	useCallback,
	useEffect,
	useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'react-query';
import { SuccessResponseV2 } from 'types/api';
import APIError from 'types/api/error';
import { PendingInvite } from 'types/api/user/getPendingInvites';
import { ROLES } from 'types/roles';

import InviteTeamMembers from '../InviteTeamMembers';
import { InviteMemberFormValues } from '../PendingInvitesContainer';

export interface InviteUserModalProps {
	isInviteTeamMemberModalOpen: boolean;
	toggleModal: (value: boolean) => void;
	form: FormInstance<InviteMemberFormValues>;
	setDataSource?: Dispatch<SetStateAction<DataProps[]>>;
	shouldCallApi?: boolean;
}

interface DataProps {
	key: number;
	name: string;
	id: string;
	email: string;
	accessLevel: ROLES;
	inviteLink: string;
}

function InviteUserModal(props: InviteUserModalProps): JSX.Element {
	const {
		isInviteTeamMemberModalOpen,
		toggleModal,
		form,
		setDataSource,
		shouldCallApi = false,
	} = props;
	const { notifications } = useNotifications();
	const { t } = useTranslation(['organizationsettings', 'common']);
	const { user } = useAppContext();
	const [isInvitingMembers, setIsInvitingMembers] = useState<boolean>(false);
	const [modalForm] = Form.useForm<InviteMemberFormValues>(form);

	const getPendingInvitesResponse = useQuery<
		SuccessResponseV2<PendingInvite[]>,
		APIError
	>({
		queryFn: get,
		queryKey: ['getPendingInvites', user?.accessJwt],
		enabled: shouldCallApi,
	});

	const getParsedInviteData = useCallback(
		(payload: PendingInvite[] = []) =>
			payload?.map((data) => ({
				key: data.createdAt,
				name: data?.name,
				id: data.id,
				email: data.email,
				accessLevel: data.role,
				inviteLink: `${window.location.origin}${ROUTES.SIGN_UP}?token=${data.token}`,
			})),
		[],
	);

	useEffect(() => {
		if (
			getPendingInvitesResponse.status === 'success' &&
			getPendingInvitesResponse?.data?.data
		) {
			const data = getParsedInviteData(
				getPendingInvitesResponse?.data?.data || [],
			);
			setDataSource?.(data);
		}
	}, [
		getParsedInviteData,
		getPendingInvitesResponse?.data?.data,
		getPendingInvitesResponse.status,
		setDataSource,
	]);

	const onInviteClickHandler = useCallback(
		async (values: InviteMemberFormValues): Promise<void> => {
			try {
				setIsInvitingMembers?.(true);
				values?.members?.forEach(
					async (member): Promise<void> => {
						try {
							await sendInvite({
								email: member.email,
								name: member?.name,
								role: member.role,
								frontendBaseUrl: window.location.origin,
							});

							notifications.success({
								message: 'Invite sent successfully',
							});
						} catch (error) {
							notifications.error({
								message: (error as APIError).getErrorCode(),
								description: (error as APIError).getErrorMessage(),
							});
						}
					},
				);

				setTimeout(async () => {
					const { data, status } = await getPendingInvitesResponse.refetch();
					if (status === 'success' && data.data) {
						setDataSource?.(getParsedInviteData(data?.data || []));
					}
					setIsInvitingMembers?.(false);
					toggleModal(false);
				}, 2000);
			} catch (error) {
				notifications.error({
					message: t('something_went_wrong', {
						ns: 'common',
					}),
				});
			}
		},
		[
			getParsedInviteData,
			getPendingInvitesResponse,
			notifications,
			setDataSource,
			setIsInvitingMembers,
			t,
			toggleModal,
		],
	);

	return (
		<Modal
			title={t('invite_team_members')}
			open={isInviteTeamMemberModalOpen}
			onCancel={(): void => toggleModal(false)}
			centered
			data-testid="invite-team-members-modal"
			destroyOnClose
			footer={[
				<Button key="back" onClick={(): void => toggleModal(false)} type="default">
					{t('cancel', {
						ns: 'common',
					})}
				</Button>,
				<Button
					key={t('invite_team_members').toString()}
					onClick={modalForm.submit}
					data-testid="invite-team-members-button"
					type="primary"
					disabled={isInvitingMembers}
					loading={isInvitingMembers}
				>
					{t('invite_team_members')}
				</Button>,
			]}
		>
			<InviteTeamMembers form={modalForm} onFinish={onInviteClickHandler} />
		</Modal>
	);
}

InviteUserModal.defaultProps = {
	setDataSource: (): void => {},
	shouldCallApi: false,
};

export default InviteUserModal;
