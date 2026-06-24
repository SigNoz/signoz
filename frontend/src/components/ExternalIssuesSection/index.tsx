import { Card, Tag, Space, Button, Spin, Empty, Tooltip } from 'antd';
import { Link, RefreshCw } from '@signozhq/icons';
import { useQuery } from 'react-query';
import { externalIssuesApi, ExternalIssue } from '../../api/externalIssues';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

interface ExternalIssuesSectionProps {
	alertFingerprint: number;
	ruleId?: string;
}

const ExternalIssuesSection = ({ alertFingerprint, ruleId }: ExternalIssuesSectionProps): JSX.Element => {
	const { data, isLoading, refetch } = useQuery(
		['externalIssues', alertFingerprint],
		() => externalIssuesApi.getByAlert(alertFingerprint),
		{
			enabled: !!alertFingerprint,
		}
	);

	const getSyncStatusTag = (status: string) => {
		const statusConfig = {
			synced: { color: 'success', text: 'Synced' },
			pending: { color: 'processing', text: 'Pending' },
			error: { color: 'error', text: 'Error' },
		};
		const config = statusConfig[status as keyof typeof statusConfig] || { color: 'default', text: status };
		return <Tag color={config.color}>{config.text}</Tag>;
	};

	const getSystemIcon = (system: string) => {
		if (system === 'jira') {
			return '🔷'; // Jira icon placeholder
		}
		if (system === 'github') {
			return '🐙'; // GitHub icon placeholder
		}
		return '🔗';
	};

	const renderIssueCard = (issue: ExternalIssue) => (
		<Card
			key={issue.id}
			size="small"
			style={{ marginBottom: '12px' }}
			extra={
				<Space>
					{getSyncStatusTag(issue.syncStatus)}
					{issue.externalIssueUrl && (
						<a href={issue.externalIssueUrl} target="_blank" rel="noopener noreferrer">
							<Button type="link" size="small" icon={<Link size={14} />}>
								Open
							</Button>
						</a>
					)}
				</Space>
			}
		>
			<Space direction="vertical" style={{ width: '100%' }}>
				<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
					<span style={{ fontSize: '16px' }}>{getSystemIcon(issue.externalSystem)}</span>
					<span style={{ fontWeight: 500 }}>{issue.externalIssueId}</span>
					<Tag>{issue.externalSystem.toUpperCase()}</Tag>
				</div>

				{issue.metadata?.jira_status && (
					<div>
						<span style={{ color: '#8c8c8c', fontSize: '12px' }}>Status: </span>
						<Tag>{issue.metadata.jira_status}</Tag>
					</div>
				)}

				<div style={{ fontSize: '12px', color: '#8c8c8c' }}>
					<Tooltip title={dayjs(issue.lastSyncedAt).format('YYYY-MM-DD HH:mm:ss')}>
						Last synced {dayjs(issue.lastSyncedAt).fromNow()}
					</Tooltip>
				</div>

				{issue.syncError && (
					<div style={{ fontSize: '12px', color: '#ff4d4f' }}>
						Error: {issue.syncError}
					</div>
				)}
			</Space>
		</Card>
	);

	return (
		<Card
			title={
				<Space>
					<span>External Issues</span>
					<Tag color="blue">{data?.total || 0}</Tag>
				</Space>
			}
			extra={
				<Button
					type="text"
					size="small"
					icon={<RefreshCw size={14} />}
					onClick={() => refetch()}
					loading={isLoading}
				>
					Refresh
				</Button>
			}
			style={{ marginTop: '16px' }}
		>
			{isLoading ? (
				<div style={{ textAlign: 'center', padding: '24px' }}>
					<Spin />
				</div>
			) : data?.items && data.items.length > 0 ? (
				<div>
					{data.items.map(renderIssueCard)}
				</div>
			) : (
				<Empty
					description="No external issues linked to this alert"
					image={Empty.PRESENTED_IMAGE_SIMPLE}
				/>
			)}
		</Card>
	);
};

export default ExternalIssuesSection;
