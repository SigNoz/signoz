import { Table, Tag, Button, Space, Input, Select, message, Tooltip } from 'antd';
import { RefreshCw, Link, Trash2, RefreshCcw } from '@signozhq/icons';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useState } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Search } = Input;
const { Option } = Select;

interface ExternalIssue {
	id: string;
	alertFingerprint: number;
	ruleId: string;
	ruleName: string;
	externalSystem: 'jira' | 'github';
	externalIssueId: string;
	externalIssueUrl: string;
	syncStatus: 'synced' | 'pending' | 'error';
	lastSyncedAt: string;
	syncError?: string;
	metadata: Record<string, any>;
	createdAt: string;
	updatedAt: string;
}

interface ExternalIssueListResponse {
	items: ExternalIssue[];
	total: number;
}

const ExternalIssues = (): JSX.Element => {
	const queryClient = useQueryClient();
	const [filters, setFilters] = useState({
		externalSystem: '',
		syncStatus: '',
		ruleId: '',
	});
	const [pagination, setPagination] = useState({
		current: 1,
		pageSize: 20,
	});

	// Fetch external issues
	const { data, isLoading, refetch } = useQuery<ExternalIssueListResponse>(
		['externalIssues', filters, pagination],
		async () => {
			const params = new URLSearchParams();
			if (filters.externalSystem) params.append('externalSystem', filters.externalSystem);
			if (filters.syncStatus) params.append('syncStatus', filters.syncStatus);
			if (filters.ruleId) params.append('ruleId', filters.ruleId);
			params.append('limit', pagination.pageSize.toString());
			params.append('offset', ((pagination.current - 1) * pagination.pageSize).toString());

			const response = await axios.get(`/api/v1/external-issues?${params.toString()}`);
			return response.data;
		},
		{
			keepPreviousData: true,
		}
	);

	// Delete mutation
	const deleteMutation = useMutation(
		async (id: string) => {
			await axios.delete(`/api/v1/external-issues/${id}`);
		},
		{
			onSuccess: () => {
				message.success('External issue mapping deleted');
				queryClient.invalidateQueries('externalIssues');
			},
			onError: () => {
				message.error('Failed to delete external issue mapping');
			},
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

	const getSystemTag = (system: string) => {
		const systemConfig = {
			jira: { color: 'blue', text: 'Jira' },
			github: { color: 'purple', text: 'GitHub' },
		};
		const config = systemConfig[system as keyof typeof systemConfig] || { color: 'default', text: system };
		return <Tag color={config.color}>{config.text}</Tag>;
	};

	const columns = [
		{
			title: 'Rule',
			dataIndex: 'ruleName',
			key: 'ruleName',
			render: (text: string, record: ExternalIssue) => (
				<div>
					<div style={{ fontWeight: 500 }}>{text || 'Unknown Rule'}</div>
					<div style={{ fontSize: '12px', color: '#8c8c8c' }}>
						Fingerprint: {record.alertFingerprint}
					</div>
				</div>
			),
		},
		{
			title: 'External System',
			dataIndex: 'externalSystem',
			key: 'externalSystem',
			width: 150,
			render: (system: string) => getSystemTag(system),
		},
		{
			title: 'External Issue',
			dataIndex: 'externalIssueId',
			key: 'externalIssueId',
			render: (issueId: string, record: ExternalIssue) => (
				<Space>
					<span>{issueId}</span>
					{record.externalIssueUrl && (
						<a href={record.externalIssueUrl} target="_blank" rel="noopener noreferrer">
							<Link size={16} />
						</a>
					)}
				</Space>
			),
		},
		{
			title: 'Sync Status',
			dataIndex: 'syncStatus',
			key: 'syncStatus',
			width: 120,
			render: (status: string, record: ExternalIssue) => (
				<Tooltip title={record.syncError || ''}>
					{getSyncStatusTag(status)}
				</Tooltip>
			),
		},
		{
			title: 'Last Synced',
			dataIndex: 'lastSyncedAt',
			key: 'lastSyncedAt',
			width: 150,
			render: (date: string) => (
				<Tooltip title={dayjs(date).format('YYYY-MM-DD HH:mm:ss')}>
					{dayjs(date).fromNow()}
				</Tooltip>
			),
		},
		{
			title: 'Jira Status',
			key: 'jiraStatus',
			width: 150,
			render: (_: any, record: ExternalIssue) => {
				if (record.externalSystem === 'jira' && record.metadata?.jira_status) {
					return <Tag>{record.metadata.jira_status}</Tag>;
				}
				return '-';
			},
		},
		{
			title: 'Actions',
			key: 'actions',
			width: 100,
			render: (_: any, record: ExternalIssue) => (
				<Space>
					<Tooltip title="Delete mapping">
						<Button
							type="text"
							danger
							size="small"
							icon={<Trash2 size={16} />}
							onClick={() => {
								if (window.confirm('Are you sure you want to delete this mapping?')) {
									deleteMutation.mutate(record.id);
								}
							}}
						/>
					</Tooltip>
				</Space>
			),
		},
	];

	return (
		<div style={{ padding: '24px' }}>
			<div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
				<h1 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>External Issues</h1>
				<Button
					icon={<RefreshCw size={16} />}
					onClick={() => refetch()}
					loading={isLoading}
				>
					Refresh
				</Button>
			</div>

			<div style={{ marginBottom: '16px', display: 'flex', gap: '12px' }}>
				<Select
					placeholder="Filter by system"
					style={{ width: 200 }}
					allowClear
					value={filters.externalSystem || undefined}
					onChange={(value) => setFilters({ ...filters, externalSystem: value || '' })}
				>
					<Option value="jira">Jira</Option>
					<Option value="github">GitHub</Option>
				</Select>

				<Select
					placeholder="Filter by sync status"
					style={{ width: 200 }}
					allowClear
					value={filters.syncStatus || undefined}
					onChange={(value) => setFilters({ ...filters, syncStatus: value || '' })}
				>
					<Option value="synced">Synced</Option>
					<Option value="pending">Pending</Option>
					<Option value="error">Error</Option>
				</Select>

				<Search
					placeholder="Search by rule ID"
					style={{ width: 300 }}
					allowClear
					value={filters.ruleId}
					onChange={(e) => setFilters({ ...filters, ruleId: e.target.value })}
					onSearch={() => refetch()}
				/>
			</div>

			<Table
				columns={columns}
				dataSource={data?.items || []}
				rowKey="id"
				loading={isLoading}
				pagination={{
					current: pagination.current,
					pageSize: pagination.pageSize,
					total: data?.total || 0,
					showSizeChanger: true,
					showTotal: (total) => `Total ${total} items`,
					onChange: (page, pageSize) => {
						setPagination({ current: page, pageSize: pageSize || 20 });
					},
				}}
			/>
		</div>
	);
};

export default ExternalIssues;
