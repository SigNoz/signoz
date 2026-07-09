import { useTranslation } from 'react-i18next';
import { Plus } from '@signozhq/icons';
import { Button, Flex, Popconfirm, Table } from 'antd';
import { ColumnsType } from 'antd/es/table';
import { Typography } from '@signozhq/ui/typography';
import { useDeleteJiraConnection } from 'container/FormAlertChannels/Settings/Jira/useDeleteJiraConnection';
import { useJiraConnect } from 'container/FormAlertChannels/Settings/Jira/useJiraConnect';
import { useJiraConnections } from 'container/FormAlertChannels/Settings/Jira/useJiraConnections';
import { useNotifications } from 'hooks/useNotifications';
import { JiraConnection } from 'types/api/channels/jiraConnections';
import APIError from 'types/api/error';

const { Text } = Typography;

function JiraConnections(): JSX.Element {
	const { t } = useTranslation(['channels']);
	const { notifications } = useNotifications();

	const { connections, isLoading, refetch } = useJiraConnections();
	const { deleteConnection, isDeleting } = useDeleteJiraConnection();
	const { connect, isConnecting } = useJiraConnect(() => {
		void refetch();
	});

	const handleDelete = async (id: string): Promise<void> => {
		try {
			await deleteConnection(id);
			notifications.success({
				message: 'Success',
				description: t('jira_connection_deleted'),
			});
		} catch (error) {
			notifications.error({
				message: (error as APIError).getErrorCode?.() || 'Error',
				description:
					(error as APIError).getErrorMessage?.() ||
					t('jira_connection_delete_failed'),
			});
		}
	};

	const columns: ColumnsType<JiraConnection> = [
		{
			title: t('jira_connection_site'),
			dataIndex: 'site_url',
			key: 'site_url',
			render: (siteURL: string, record): string => siteURL || record.cloud_id,
		},
		{
			title: t('jira_connection_cloud_id'),
			dataIndex: 'cloud_id',
			key: 'cloud_id',
		},
		{
			title: '',
			key: 'actions',
			width: 120,
			render: (_, record): JSX.Element => (
				<Popconfirm
					title={t('jira_connection_delete_confirm')}
					onConfirm={(): Promise<void> => handleDelete(record.id)}
					okButtonProps={{ loading: isDeleting }}
				>
					<Button
						danger
						type="text"
						data-testid={`jira-connection-delete-${record.id}`}
					>
						{t('jira_connection_delete')}
					</Button>
				</Popconfirm>
			),
		},
	];

	return (
		<div className="jira-connections-container">
			<Flex justify="space-between" align="center" style={{ marginBottom: 12 }}>
				<Text>{t('jira_connections_title')}</Text>
				<Button
					icon={<Plus size={16} />}
					onClick={(): void => {
						void connect();
					}}
					loading={isConnecting}
					data-testid="jira-connection-add"
				>
					{t('button_add_jira_connection')}
				</Button>
			</Flex>

			<Table<JiraConnection>
				rowKey="id"
				loading={isLoading}
				dataSource={connections}
				columns={columns}
				pagination={false}
				locale={{ emptyText: t('jira_connections_empty') }}
			/>
		</div>
	);
}

export default JiraConnections;
