import './styles.scss';

import { Button, Card, Input, message, Space, Steps, Typography } from 'antd';
import getJiraWebhookUrl from 'api/Integrations/getJiraWebhookUrl';
import { Copy, ExternalLink } from '@signozhq/icons';
import { useEffect, useState } from 'react';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;

function JiraIntegrationSettings(): JSX.Element {
	const [webhookUrl, setWebhookUrl] = useState<string>('');
	const [editableWebhookUrl, setEditableWebhookUrl] = useState<string>('');
	const [loading, setLoading] = useState(true);
	const [isLocalhost, setIsLocalhost] = useState(false);
	const [note, setNote] = useState<string>('');

	useEffect(() => {
		const fetchWebhookUrl = async (): Promise<void> => {
			setLoading(true);
			try {
				const response = await getJiraWebhookUrl();
				if (response.payload) {
					const url = response.payload.webhook_url;
					setWebhookUrl(url);
					setEditableWebhookUrl(url);
					setIsLocalhost(response.payload.is_localhost || false);
					setNote(response.payload.note || '');
				}
			} catch (error) {
				message.error('Failed to load webhook URL');
			} finally {
				setLoading(false);
			}
		};

		fetchWebhookUrl();
	}, []);

	const copyToClipboard = (): void => {
		navigator.clipboard.writeText(editableWebhookUrl);
		message.success('Webhook URL copied to clipboard!');
	};

	const handleWebhookUrlChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
		setEditableWebhookUrl(e.target.value);
	};

	return (
		<div className="jira-integration-settings">
			<div className="jira-integration-header">
				<Title level={3}>Jira Integration</Title>
				<Paragraph>
					Enable bi-directional syncing between SigNoz alerts and Jira issues.
				</Paragraph>
				{note && (
					<Paragraph style={{ marginTop: 4, color: '#8c8c8c' }}>{note}</Paragraph>
				)}
			</div>

			<Card className="webhook-card">
				<Title level={4}>Configure Jira Webhook</Title>
				<Paragraph>
					To enable bi-directional syncing between alerts and Jira issues, configure
					a Jira webhook with the URL below.
				</Paragraph>

				{isLocalhost && (
					<div className="localhost-warning" style={{ 
						padding: '16px', 
						backgroundColor: '#fff7e6', 
						border: '1px solid #ffd591',
						borderRadius: '4px',
						marginBottom: '16px'
					}}>
						<Text strong style={{ color: '#d46b08', fontSize: '14px' }}>⚠️ Local Development Detected - Action Required</Text>
						<Paragraph style={{ marginTop: 12, marginBottom: 8, fontSize: '13px' }}>
							<strong>Jira requires HTTPS webhooks and cannot reach localhost.</strong> You must use a tunneling service like ngrok to expose your local server.
						</Paragraph>
						<Paragraph style={{ marginTop: 8, marginBottom: 0, fontSize: '13px' }}>
							<strong>Setup Steps:</strong>
							<ol style={{ marginTop: 8, paddingLeft: 20, marginBottom: 0 }}>
								<li>Install ngrok: <code style={{ backgroundColor: '#fff', padding: '2px 6px', borderRadius: '3px' }}>brew install ngrok</code> (macOS) or download from <a href="https://ngrok.com/download" target="_blank" rel="noopener noreferrer">ngrok.com</a></li>
								<li>Run: <code style={{ backgroundColor: '#fff', padding: '2px 6px', borderRadius: '3px' }}>ngrok http 8080</code></li>
								<li>Copy the HTTPS URL from ngrok (e.g., <code style={{ backgroundColor: '#fff', padding: '2px 6px', borderRadius: '3px' }}>https://abc123.ngrok.io</code>)</li>
								<li><strong>Replace <code style={{ backgroundColor: '#fff', padding: '2px 6px', borderRadius: '3px' }}>localhost:8080</code> in the webhook URL below with your ngrok URL</strong></li>
							</ol>
						</Paragraph>
						<Paragraph style={{ marginTop: 12, marginBottom: 0, fontSize: '13px', color: '#d46b08' }}>
							<strong>Example:</strong> Change <code style={{ backgroundColor: '#fff', padding: '2px 6px', borderRadius: '3px' }}>https://localhost:8080/api/v1/webhooks/jira/...</code> to <code style={{ backgroundColor: '#fff', padding: '2px 6px', borderRadius: '3px' }}>https://abc123.ngrok.io/api/v1/webhooks/jira/...</code>
						</Paragraph>
					</div>
				)}

				<div className="webhook-url-section">
					<Text strong>Webhook URL:</Text>
					{isLocalhost && (
						<Paragraph style={{ marginTop: 4, marginBottom: 8, fontSize: '12px', color: '#8c8c8c' }}>
							Edit the URL below to replace <code>localhost:8080</code> with your ngrok URL
						</Paragraph>
					)}
					<Space.Compact style={{ width: '100%', marginTop: 8 }}>
						<Input
							value={editableWebhookUrl}
							onChange={handleWebhookUrlChange}
							readOnly={!isLocalhost}
							placeholder={loading ? "Loading webhook URL..." : "Webhook URL"}
							style={{ fontFamily: 'monospace', fontSize: '12px' }}
						/>
						<Button
							icon={<Copy size={16} />}
							onClick={copyToClipboard}
							disabled={!editableWebhookUrl || loading}
						>
							Copy
						</Button>
					</Space.Compact>
					{isLocalhost && editableWebhookUrl !== webhookUrl && (
						<Paragraph style={{ marginTop: 8, marginBottom: 0, fontSize: '12px', color: '#52c41a' }}>
							✓ URL modified - ready to use with your tunnel
						</Paragraph>
					)}
				</div>

				<div className="setup-instructions">
					<Title level={5} style={{ marginTop: 24 }}>
						Setup Instructions
					</Title>

					<Steps direction="vertical" current={-1}>
						<Step
							title="Go to Jira Settings"
							description={
								<>
									In Jira, click the <strong>Gear icon</strong> in the top right
									corner and select <strong>System</strong>.
								</>
							}
						/>
						<Step
							title="Navigate to Webhooks"
							description={
								<>
									In the left menu under <strong>Advanced</strong>, click{' '}
									<strong>Webhooks</strong>.
								</>
							}
						/>
						<Step
							title="Create a Webhook"
							description={
								<>
									Click <strong>Create a Webhook</strong> in the right corner.
								</>
							}
						/>
						<Step
							title="Configure Webhook"
							description={
								<div>
									<ul style={{ paddingLeft: 20 }}>
										<li>
											<strong>Name:</strong> SigNoz Integration
										</li>
										<li>
											<strong>Status:</strong> Enabled
										</li>
										<li>
											<strong>URL:</strong> Paste the webhook URL from above
										</li>
									</ul>
								</div>
							}
						/>
						<Step
							title="Select Events"
							description={
								<div>
									<p>Enable the following issue-related events:</p>
									<ul style={{ paddingLeft: 20 }}>
										<li>Issue → updated</li>
										<li>Issue → deleted</li>
									</ul>
									<p style={{ marginTop: 8 }}>
										Leave everything else unchecked.
									</p>
								</div>
							}
						/>
						<Step
							title="Save"
							description={
								<>
									Click the <strong>Create</strong> button at the bottom of the
									page.
								</>
							}
						/>
					</Steps>
				</div>

				<div className="help-section">
					<Title level={5} style={{ marginTop: 24 }}>
						What happens after setup?
					</Title>
					<ul>
						<li>
							When an alert fires and creates a Jira issue, the mapping is
							automatically created
						</li>
						<li>
							When you update a Jira issue status, SigNoz syncs the changes
							automatically
						</li>
						<li>
							View all linked issues on the{' '}
							<a href="/issues">External Issues page</a>
						</li>
					</ul>

					<Button
						type="link"
						icon={<ExternalLink size={16} />}
						href="https://support.atlassian.com/jira-cloud-administration/docs/manage-webhooks/"
						target="_blank"
						style={{ paddingLeft: 0 }}
					>
						Learn more about Jira webhooks
					</Button>
				</div>
			</Card>
		</div>
	);
}

export default JiraIntegrationSettings;
