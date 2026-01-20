import { Button, Form, Modal } from 'antd';
import { FormInstance } from 'antd/lib';
import sendInvite from 'api/v1/invite/create';
import { useNotifications } from 'hooks/useNotifications';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import APIError from 'types/api/error';

import InviteTeamMembers from '../InviteTeamMembers';
import { InviteMemberFormValues } from '../PendingInvitesContainer';

export interface InviteUserModalProps {
	isInviteTeamMemberModalOpen: boolean;
	toggleModal: (value: boolean) => void;
	form: FormInstance<InviteMemberFormValues>;
	onClose: () => void;
}

function InviteUserModal(props: InviteUserModalProps): JSX.Element {
	const {
		isInviteTeamMemberModalOpen,
		toggleModal,
		form,

		onClose,
	} = props;
	const { notifications } = useNotifications();
	const { t } = useTranslation(['organizationsettings', 'common']);

	const [isInvitingMembers, setIsInvitingMembers] = useState<boolean>(false);
	const [modalForm] = Form.useForm<InviteMemberFormValues>(form);

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
					onClose();
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
		[notifications, onClose, t, toggleModal],
	);

	return (
		<Modal
			title={t('invite_team_members')}
			open={isInviteTeamMemberModalOpen}
			onCancel={(): void => toggleModal(false)}
			centered
			data-testid="invite-team-members-modal"
			className="invite-user-modal"
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

export default InviteUserModal;
