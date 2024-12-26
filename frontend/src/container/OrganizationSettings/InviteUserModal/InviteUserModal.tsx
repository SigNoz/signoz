import { Button, Form, Modal } from 'antd';
import { FormInstance } from 'antd/lib';
import getPendingInvites from 'api/user/getPendingInvites';
import sendInvite from 'api/user/sendInvite';
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
import { PayloadProps } from 'types/api/user/getPendingInvites';
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

	const getPendingInvitesResponse = useQuery({
		queryFn: getPendingInvites,
		queryKey: ['getPendingInvites', user?.accessJwt],
		enabled: shouldCallApi,
	});

	const getParsedInviteData = useCallback(
		(payload: PayloadProps = []) =>
			payload?.map((data) => ({
				key: data.createdAt,
				name: data?.name,
				email: data.email,
				accessLevel: data.role,
				inviteLink: `${window.location.origin}${ROUTES.SIGN_UP}?token=${data.token}`,
			})),
		[],
	);

	useEffect(() => {
		if (
			getPendingInvitesResponse.status === 'success' &&
			getPendingInvitesResponse?.data?.payload
		) {
			const data = getParsedInviteData(
				getPendingInvitesResponse?.data?.payload || [],
			);
			setDataSource?.(data);
		}
	}, [
		getParsedInviteData,
		getPendingInvitesResponse?.data?.payload,
		getPendingInvitesResponse.status,
		setDataSource,
	]);

	const onInviteClickHandler = useCallback(
		async (values: InviteMemberFormValues): Promise<void> => {
			try {
				setIsInvitingMembers?.(true);
				values?.members?.forEach(
					async (member): Promise<void> => {
						const { error, statusCode } = await sendInvite({
							email: member.email,
							name: member?.name,
							role: member.role,
							frontendBaseUrl: window.location.origin,
						});

						if (statusCode !== 200) {
							notifications.error({
								message:
									error ||
									t('something_went_wrong', {
										ns: 'common',
									}),
							});
						} else if (statusCode === 200) {
							notifications.success({
								message: 'Invite sent successfully',
							});
						}
					},
				);

				setTimeout(async () => {
					const { data, status } = await getPendingInvitesResponse.refetch();
					if (status === 'success' && data.payload) {
						setDataSource?.(getParsedInviteData(data?.payload || []));
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
