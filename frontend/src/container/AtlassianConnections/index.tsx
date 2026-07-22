import { useTranslation } from 'react-i18next';
import { LoaderCircle, Plus } from '@signozhq/icons';
import { Button as AntdButton, Flex } from 'antd';
import { ColumnsType } from 'antd/es/table';
import { Typography } from '@signozhq/ui/typography';
import { ResizeTable } from 'components/ResizeTable';
import { AtlassianConnection } from 'types/api/channels/atlassian';
import {
	Button,
	ButtonContainer,
	RightActionContainer,
} from 'container/AllAlertChannels/styles';
import { useAtlassianConnections } from 'container/FormAlertChannels/Settings/Atlassian/useAtlassianConnections';
import { useDeleteAtlassianConnection } from 'container/FormAlertChannels/Settings/Atlassian/useDeleteAtlassianConnection';
import { useAtlassianConnect } from 'container/FormAlertChannels/Settings/Atlassian/useAtlassianConnect';
import { useNotifications } from 'hooks/useNotifications';
import APIError from 'types/api/error';

import 'container/AllAlertChannels/AllAlertChannels.styles.scss';

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
				<AntdButton
					danger
					type="text"
					loading={isDeleting}
					data-testid={`atlassian-connection-delete-${record.id}`}
					onClick={(): Promise<void> => handleDelete(record.id)}
				>
					{t('atlassian_connection_delete')}
				</AntdButton>
			),
		},
	];

	return (
		<div className="alert-channels-container">
			<ButtonContainer>
				<Text truncate={1} color="muted">
					{t('atlassian_connections_title')}
				</Text>

				<RightActionContainer>
					<Button
						onClick={(): void => {
							void connect();
						}}
						disabled={isConnecting}
						data-testid="atlassian-connection-add"
					>
						<Flex align="center" gap={4} style={{ display: 'inline-flex' }}>
							{isConnecting ? (
								<LoaderCircle className="animate-spin" size={16} />
							) : (
								<Plus size="md" />
							)}
							{t('button_add_atlassian_connection')}
						</Flex>
					</Button>
				</RightActionContainer>
			</ButtonContainer>

			<ResizeTable
				rowKey="id"
				loading={isLoading}
				dataSource={connections}
				columns={columns}
				pagination={false}
				bordered
				data-testid="atlassian-connections-table"
			/>
		</div>
	);
}

export default AtlassianConnections;
