import { useTranslation } from 'react-i18next';
import { Plus } from '@signozhq/icons';
import { Button, Flex, Popconfirm, Table } from 'antd';
import { ColumnsType } from 'antd/es/table';
import { Typography } from '@signozhq/ui/typography';
import { JsmOpsConnection } from 'types/api/channels/jsmOps';
import { useJsmOpsConnections } from 'container/FormAlertChannels/Settings/useJsmOpsConnections';
import { useDeleteJsmOpsConnection } from 'container/FormAlertChannels/Settings/useDeleteJsmOpsConnection';
import { useJsmOpsConnect } from 'container/FormAlertChannels/Settings/useJsmOpsConnect';
import { useNotifications } from 'hooks/useNotifications';
import APIError from 'types/api/error';

const { Text } = Typography;

function JsmOpsConnections(): JSX.Element {
	const { t } = useTranslation(['channels']);
	const { notifications } = useNotifications();

	const { connections, isLoading, refetch } = useJsmOpsConnections();
	const { deleteConnection, isDeleting } = useDeleteJsmOpsConnection();
	const { connect, isConnecting } = useJsmOpsConnect(() => {
		void refetch();
	});

	const handleDelete = async (id: string): Promise<void> => {
		try {
			await deleteConnection(id);
			notifications.success({
				message: 'Success',
				description: t('jsmops_connection_deleted'),
			});
		} catch (error) {
			notifications.error({
				message: (error as APIError).getErrorCode?.() || 'Error',
				description:
					(error as APIError).getErrorMessage?.() ||
					t('jsmops_connection_delete_failed'),
			});
		}
	};

	const columns: ColumnsType<JsmOpsConnection> = [
		{
			title: t('jsmops_connection_site'),
			dataIndex: 'site_url',
			key: 'site_url',
			render: (siteURL: string, record): string => siteURL || record.cloud_id,
		},
		{
			title: t('jsmops_connection_cloud_id'),
			dataIndex: 'cloud_id',
			key: 'cloud_id',
		},
		{
			title: '',
			key: 'actions',
			width: 120,
			render: (_, record): JSX.Element => (
				<Popconfirm
					title={t('jsmops_connection_delete_confirm')}
					onConfirm={(): Promise<void> => handleDelete(record.id)}
					okButtonProps={{ loading: isDeleting }}
				>
					<Button
						danger
						type="text"
						data-testid={`jsmops-connection-delete-${record.id}`}
					>
						{t('jsmops_connection_delete')}
					</Button>
				</Popconfirm>
			),
		},
	];

	return (
		<div className="jsmops-connections-container">
			<Flex justify="space-between" align="center" style={{ marginBottom: 12 }}>
				<Text>{t('jsmops_connections_title')}</Text>
				<Button
					icon={<Plus size="md" />}
					onClick={(): void => {
						void connect();
					}}
					loading={isConnecting}
					data-testid="jsmops-connection-add"
				>
					{t('button_add_jsmops_connection')}
				</Button>
			</Flex>

			<Table<JsmOpsConnection>
				rowKey="id"
				loading={isLoading}
				dataSource={connections}
				columns={columns}
				pagination={false}
				locale={{ emptyText: t('jsmops_connections_empty') }}
				data-testid="jsmops-connections-table"
			/>
		</div>
	);
}

export default JsmOpsConnections;
