import { useTranslation } from 'react-i18next';
import { Plus } from '@signozhq/icons';
import { Button, Flex, Popconfirm, Table } from 'antd';
import { ColumnsType } from 'antd/es/table';
import { Typography } from '@signozhq/ui/typography';
import { AtlassianConnection } from 'types/api/channels/atlassian';
import { useAtlassianConnections } from 'container/FormAlertChannels/Settings/Atlassian/useAtlassianConnections';
import { useDeleteAtlassianConnection } from 'container/FormAlertChannels/Settings/Atlassian/useDeleteAtlassianConnection';
import { useAtlassianConnect } from 'container/FormAlertChannels/Settings/Atlassian/useAtlassianConnect';
import { useNotifications } from 'hooks/useNotifications';
import APIError from 'types/api/error';

const { Text } = Typography;

function AtlassianConnections(): JSX.Element {
	const { t } = useTranslation(['channels']);
	const { notifications } = useNotifications();

	const { connections, isLoading, refetch } = useAtlassianConnections();
	const { deleteConnection, isDeleting } = useDeleteAtlassianConnection();
	const { connect, isConnecting } = useAtlassianConnect(() => {
		void refetch();
	});

	const handleDelete = async (id: string): Promise<void> => {
		try {
			await deleteConnection(id);
			notifications.success({
				message: 'Success',
				description: t('atlassian_connection_deleted'),
			});
		} catch (error) {
			notifications.error({
				message: (error as APIError).getErrorCode?.() || 'Error',
				description:
					(error as APIError).getErrorMessage?.() ||
					t('atlassian_connection_delete_failed'),
			});
		}
	};

	const columns: ColumnsType<AtlassianConnection> = [
		{
			title: t('atlassian_connection_site'),
			dataIndex: 'site_url',
			key: 'site_url',
			render: (siteURL: string, record): string => siteURL || record.cloud_id,
		},
		{
			title: t('atlassian_connection_cloud_id'),
			dataIndex: 'cloud_id',
			key: 'cloud_id',
		},
		{
			title: '',
			key: 'actions',
			width: 120,
			render: (_, record): JSX.Element => (
				<Popconfirm
					title={t('atlassian_connection_delete_confirm')}
					onConfirm={(): Promise<void> => handleDelete(record.id)}
					okButtonProps={{ loading: isDeleting }}
				>
					<Button
						danger
						type="text"
						data-testid={`atlassian-connection-delete-${record.id}`}
					>
						{t('atlassian_connection_delete')}
					</Button>
				</Popconfirm>
			),
		},
	];

	return (
		<div className="atlassian-connections-container">
			<Flex justify="space-between" align="center" style={{ marginBottom: 12 }}>
				<Text>{t('atlassian_connections_title')}</Text>
				<Button
					icon={<Plus size="md" />}
					onClick={(): void => {
						void connect();
					}}
					loading={isConnecting}
					data-testid="atlassian-connection-add"
				>
					{t('button_add_atlassian_connection')}
				</Button>
			</Flex>

			<Table<AtlassianConnection>
				rowKey="id"
				loading={isLoading}
				dataSource={connections}
				columns={columns}
				pagination={false}
				locale={{ emptyText: t('atlassian_connections_empty') }}
				data-testid="atlassian-connections-table"
			/>
		</div>
	);
}

export default AtlassianConnections;
