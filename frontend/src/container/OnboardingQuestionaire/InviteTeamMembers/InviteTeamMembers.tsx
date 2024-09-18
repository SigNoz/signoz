import { Button, Input, Select, Typography } from 'antd';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface InviteTeamMembersProps {
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
	onNext,
	onBack,
}: InviteTeamMembersProps): JSX.Element {
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
							<Input
								addonAfter={userRolesOptions}
								placeholder="your-teammate@org.com"
							/>

							<Input
								addonAfter={userRolesOptions}
								placeholder="your-teammate@org.com"
							/>

							<Input
								addonAfter={userRolesOptions}
								placeholder="your-teammate@org.com"
							/>
						</div>
					</div>
				</div>

				<div className="next-prev-container">
					<Button type="default" className="next-button" onClick={onBack}>
						<ArrowLeft size={14} />
						Back
					</Button>

					<Button type="primary" className="next-button" onClick={onNext}>
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
