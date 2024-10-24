import './InviteTeamMembers.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Button, Input, Select, Typography } from 'antd';
import inviteUsers from 'api/user/inviteUsers';
import { AxiosError } from 'axios';
import { cloneDeep, debounce, isEmpty } from 'lodash-es';
import {
	ArrowLeft,
	ArrowRight,
	CheckCircle,
	Plus,
	TriangleAlert,
	X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useMutation } from 'react-query';
import { ErrorResponse } from 'types/api';
import { v4 as uuid } from 'uuid';

interface TeamMember {
	email: string;
	role: string;
	name: string;
	frontendBaseUrl: string;
	id: string;
}

interface InviteTeamMembersProps {
	teamMembers: TeamMember[] | null;
	setTeamMembers: (teamMembers: TeamMember[]) => void;
	onNext: () => void;
	onBack: () => void;
}

function InviteTeamMembers({
	teamMembers,
	setTeamMembers,
	onNext,
	onBack,
}: InviteTeamMembersProps): JSX.Element {
	const [teamMembersToInvite, setTeamMembersToInvite] = useState<
		TeamMember[] | null
	>(teamMembers);
	const [emailValidity, setEmailValidity] = useState<Record<string, boolean>>(
		{},
	);
	const [hasInvalidEmails, setHasInvalidEmails] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

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

	const handleError = (error: AxiosError): void => {
		const errorMessage = error.response?.data as ErrorResponse;

		setError(errorMessage.error);
	};

	const { mutate: sendInvites, isLoading: isSendingInvites } = useMutation(
		inviteUsers,
		{
			onSuccess: (): void => {
				onNext();
			},
			onError: (error): void => {
				handleError(error as AxiosError);
			},
		},
	);

	const handleNext = (): void => {
		if (validateAllUsers()) {
			setTeamMembers(teamMembersToInvite || []);

			setError(null);
			setHasInvalidEmails(false);

			sendInvites({
				users: teamMembersToInvite || [],
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

	const handleDoLater = (): void => {
		onNext();
	};

	return (
		<div className="questions-container">
			<Typography.Title level={3} className="title">
				Observability made collaborative
			</Typography.Title>
			<Typography.Paragraph className="sub-title">
				The more your team uses SigNoz, the stronger your observability. Share
				dashboards, collaborate on alerts, and troubleshoot faster together.
			</Typography.Paragraph>

			<div className="questions-form-container">
				<div className="questions-form invite-team-members-form">
					<div className="form-group">
						<div className="question-label">
							Collaborate with your team
							<div className="question-sub-label">
								Invite your team to the SigNoz workspace
							</div>
						</div>

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
											type="primary"
											className="remove-team-member-button"
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
								className="add-another-member-button"
								icon={<Plus size={14} />}
								onClick={handleAddTeamMember}
							>
								Member
							</Button>
						</div>
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

				{error && (
					<div className="error-message-container">
						<Typography.Text className="error-message" type="danger">
							<TriangleAlert size={14} /> {error}
						</Typography.Text>
					</div>
				)}

				<div className="next-prev-container">
					<Button type="default" className="next-button" onClick={onBack}>
						<ArrowLeft size={14} />
						Back
					</Button>

					<Button
						type="primary"
						className="next-button"
						onClick={handleNext}
						loading={isSendingInvites}
					>
						Send Invites
						<ArrowRight size={14} />
					</Button>
				</div>

				<div className="do-later-container">
					<Button type="link" onClick={handleDoLater}>
						I&apos;ll do this later
					</Button>
				</div>
			</div>
		</div>
	);
}

export default InviteTeamMembers;
