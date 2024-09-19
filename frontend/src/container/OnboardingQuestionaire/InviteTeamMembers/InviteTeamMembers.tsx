import { Color } from '@signozhq/design-tokens';
import { Button, Input, Select, Typography } from 'antd';
import {
	ArrowLeft,
	ArrowRight,
	CheckCircle,
	Plus,
	TriangleAlert,
} from 'lucide-react';
import { useState } from 'react';

interface InviteTeamMembersProps {
	teamMembers: string[];
	setTeamMembers: (teamMembers: string[]) => void;
	onNext: () => void;
	onBack: () => void;
}

const userRolesOptions = (
	<Select defaultValue="editor">
		<Select.Option value="viewer">Viewer</Select.Option>
		<Select.Option value="editor">Editor</Select.Option>
		<Select.Option value="Admin">Admin</Select.Option>
	</Select>
);

function InviteTeamMembers({
	teamMembers,
	setTeamMembers,
	onNext,
	onBack,
}: InviteTeamMembersProps): JSX.Element {
	const [teamMembersToInvite, setTeamMembersToInvite] = useState<string[]>(
		teamMembers || [''],
	);

	const handleAddTeamMember = (): void => {
		setTeamMembersToInvite([...teamMembersToInvite, '']);
	};

	const handleNext = (): void => {
		console.log(teamMembersToInvite);
		setTeamMembers(teamMembersToInvite);
		onNext();
	};

	const handleOnChange = (
		e: React.ChangeEvent<HTMLInputElement>,
		index: number,
	): void => {
		const newTeamMembers = [...teamMembersToInvite];
		newTeamMembers[index] = e.target.value;
		setTeamMembersToInvite(newTeamMembers);
	};

	const isValidEmail = (email: string): boolean => {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(email);
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
				<div className="questions-form">
					<div className="form-group">
						<div className="question-label">
							Collaborate with your team
							<div className="question-sub-label">
								Invite your team to the SigNoz workspace
							</div>
						</div>

						<div className="invite-team-members-container">
							{teamMembersToInvite.map((member, index) => (
								// eslint-disable-next-line react/no-array-index-key
								<div className="team-member-container" key={`${member}-${index}`}>
									<Input
										addonBefore={userRolesOptions}
										addonAfter={
											// eslint-disable-next-line no-nested-ternary
											member.length > 0 ? (
												isValidEmail(member) ? (
													<CheckCircle size={14} color={Color.BG_FOREST_500} />
												) : (
													<TriangleAlert size={14} color={Color.BG_SIENNA_500} />
												)
											) : null
										}
										placeholder="your-teammate@org.com"
										value={member}
										type="email"
										required
										autoFocus
										autoComplete="off"
										onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
											handleOnChange(e, index)
										}
									/>
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

				<div className="next-prev-container">
					<Button type="default" className="next-button" onClick={onBack}>
						<ArrowLeft size={14} />
						Back
					</Button>

					<Button type="primary" className="next-button" onClick={handleNext}>
						Send Invites
						<ArrowRight size={14} />
					</Button>
				</div>

				<div className="do-later-container">
					<Button type="link" onClick={onNext}>
						I&apos;ll do this later
					</Button>
				</div>
			</div>
		</div>
	);
}

export default InviteTeamMembers;
