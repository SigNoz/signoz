import './InviteTeamMembers.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Button, Input, Select, Typography } from 'antd';
import logEvent from 'api/common/logEvent';
import inviteUsers from 'api/v1/invite/bulk/create';
import { useNotifications } from 'hooks/useNotifications';
import { cloneDeep, debounce, isEmpty } from 'lodash-es';
import { ArrowRight, CheckCircle, Plus, TriangleAlert, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useMutation } from 'react-query';
import APIError from 'types/api/error';
import { v4 as uuid } from 'uuid';

interface TeamMember {
	email: string;
	role: string;
	name: string;
	frontendBaseUrl: string;
	id: string;
}

interface InviteTeamMembersProps {
	isLoading: boolean;
	teamMembers: TeamMember[] | null;
	setTeamMembers: (teamMembers: TeamMember[]) => void;
	onNext: () => void;
	onClose: () => void;
}

const ONBOARDING_V3_ANALYTICS_EVENTS_MAP = {
	BASE: 'Onboarding V3',
	INVITE_TEAM_MEMBER_BUTTON_CLICKED: 'Send invites clicked',
	INVITE_TEAM_MEMBER_SUCCESS: 'Invite team members success',
	INVITE_TEAM_MEMBER_PARTIAL_SUCCESS: 'Invite team members partial success',
	INVITE_TEAM_MEMBER_FAILED: 'Invite team members failed',
};

function InviteTeamMembers({
	isLoading,
	teamMembers,
	setTeamMembers,
	onNext,
	onClose,
}: InviteTeamMembersProps): JSX.Element {
	const [teamMembersToInvite, setTeamMembersToInvite] = useState<
		TeamMember[] | null
	>(teamMembers);
	const [emailValidity, setEmailValidity] = useState<Record<string, boolean>>(
		{},
	);
	const [hasInvalidEmails, setHasInvalidEmails] = useState<boolean>(false);
	const { notifications } = useNotifications();

	const defaultTeamMember: TeamMember = {
		email: '',
		role: 'EDITOR',
		name: '',
		frontendBaseUrl: window.location.origin,
		id: '',
	};

	useEffect(() => {
		if (isEmpty(teamMembers)) {
			const teamMember = {
				...defaultTeamMember,
				id: uuid(),
			};

			setTeamMembersToInvite([teamMember]);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [teamMembers]);

	const handleAddTeamMember = (): void => {
		const newTeamMember = {
			...defaultTeamMember,
			id: uuid(),
		};
		setTeamMembersToInvite((prev) => [...(prev || []), newTeamMember]);
	};

	const handleRemoveTeamMember = (id: string): void => {
		setTeamMembersToInvite((prev) => (prev || []).filter((m) => m.id !== id));
	};

	// Validation function to check all users
	const validateAllUsers = (): boolean => {
		let isValid = true;

		const updatedValidity: Record<string, boolean> = {};

		teamMembersToInvite?.forEach((member) => {
			const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(member.email);
			if (!emailValid || !member.email) {
				isValid = false;
				setHasInvalidEmails(true);
			}
			updatedValidity[member.id!] = emailValid;
		});

		setEmailValidity(updatedValidity);

		return isValid;
	};

	const handleInviteUsersSuccess = (): void => {
		logEvent(
			`${ONBOARDING_V3_ANALYTICS_EVENTS_MAP?.BASE}: ${ONBOARDING_V3_ANALYTICS_EVENTS_MAP?.INVITE_TEAM_MEMBER_SUCCESS}`,
			{
				teamMembers: teamMembersToInvite,
			},
		);
		setTimeout(() => {
			onNext();
		}, 1000);
	};

	const { mutate: sendInvites, isLoading: isSendingInvites } = useMutation(
		inviteUsers,
		{
			onSuccess: (): void => {
				handleInviteUsersSuccess();
				notifications.success({
					message: 'Invites sent successfully!',
				});
			},
			onError: (error: APIError): void => {
				logEvent(
					`${ONBOARDING_V3_ANALYTICS_EVENTS_MAP?.BASE}: ${ONBOARDING_V3_ANALYTICS_EVENTS_MAP?.INVITE_TEAM_MEMBER_FAILED}`,
					{
						teamMembers: teamMembersToInvite,
						error,
					},
				);
				notifications.error({
					message: error.getErrorCode(),
					description: error.getErrorMessage(),
				});
			},
		},
	);

	const handleNext = (): void => {
		if (validateAllUsers()) {
			setTeamMembers(teamMembersToInvite || []);

			logEvent(
				`${ONBOARDING_V3_ANALYTICS_EVENTS_MAP?.BASE}: ${ONBOARDING_V3_ANALYTICS_EVENTS_MAP?.INVITE_TEAM_MEMBER_BUTTON_CLICKED}`,
				{
					teamMembers: teamMembersToInvite,
				},
			);

			setHasInvalidEmails(false);
			sendInvites({
				invites: teamMembersToInvite || [],
			});
		}
	};

	// eslint-disable-next-line react-hooks/exhaustive-deps
	const debouncedValidateEmail = useCallback(
		debounce((email: string, memberId: string) => {
			const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
			setEmailValidity((prev) => ({ ...prev, [memberId]: isValid }));
		}, 500),
		[],
	);

	const handleEmailChange = (
		e: React.ChangeEvent<HTMLInputElement>,
		member: TeamMember,
	): void => {
		const { value } = e.target;
		const updatedMembers = cloneDeep(teamMembersToInvite || []);

		const memberToUpdate = updatedMembers.find((m) => m.id === member.id);
		if (memberToUpdate) {
			memberToUpdate.email = value;
			setTeamMembersToInvite(updatedMembers);
			debouncedValidateEmail(value, member.id!);
		}
	};

	const handleRoleChange = (role: string, member: TeamMember): void => {
		const updatedMembers = cloneDeep(teamMembersToInvite || []);
		const memberToUpdate = updatedMembers.find((m) => m.id === member.id);
		if (memberToUpdate) {
			memberToUpdate.role = role;
			setTeamMembersToInvite(updatedMembers);
		}
	};

	return (
		<div className="invite-team-members-container">
			<div className="invite-team-members-form">
				<div className="form-group">
					<div className="invite-team-members-container">
						{teamMembersToInvite?.map((member) => (
							<div className="team-member-container" key={member.id}>
								<Input
									placeholder="your-teammate@org.com"
									value={member.email}
									type="email"
									required
									autoFocus
									autoComplete="off"
									className="team-member-email-input"
									onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
										handleEmailChange(e, member)
									}
									addonAfter={
										// eslint-disable-next-line no-nested-ternary
										emailValidity[member.id!] === undefined ? null : emailValidity[
												member.id!
										  ] ? (
											<CheckCircle size={14} color={Color.BG_FOREST_500} />
										) : (
											<TriangleAlert size={14} color={Color.BG_SIENNA_500} />
										)
									}
								/>
								<Select
									defaultValue={member.role}
									onChange={(value): void => handleRoleChange(value, member)}
									className="team-member-role-select"
								>
									<Select.Option value="VIEWER">Viewer</Select.Option>
									<Select.Option value="EDITOR">Editor</Select.Option>
									<Select.Option value="ADMIN">Admin</Select.Option>
								</Select>

								{teamMembersToInvite?.length > 1 && (
									<Button
										type="default"
										className="remove-team-member-button periscope-btn"
										icon={<X size={14} />}
										onClick={(): void => handleRemoveTeamMember(member.id)}
									/>
								)}
							</div>
						))}
					</div>

					<div className="invite-team-members-add-another-member-container">
						<Button
							type="primary"
							className="add-another-member-button periscope-btn"
							icon={<Plus size={14} />}
							onClick={handleAddTeamMember}
						>
							Member
						</Button>
					</div>
				</div>

				{hasInvalidEmails && (
					<div className="error-message-container">
						<Typography.Text className="error-message" type="danger">
							<TriangleAlert size={14} /> Please enter valid emails for all team
							members
						</Typography.Text>
					</div>
				)}
			</div>
			<div className="next-prev-container">
				<Button
					type="default"
					className="next-button periscope-btn"
					onClick={onClose}
				>
					<X size={14} />
					Cancel
				</Button>

				<Button
					type="primary"
					className="next-button periscope-btn primary"
					onClick={handleNext}
					loading={isSendingInvites || isLoading}
				>
					Send Invites
					<ArrowRight size={14} />
				</Button>
			</div>
		</div>
	);
}

export default InviteTeamMembers;
