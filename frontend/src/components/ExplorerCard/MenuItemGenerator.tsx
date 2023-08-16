import { DeleteOutlined } from '@ant-design/icons';
import { Col, Row, Typography } from 'antd';
import axios from 'axios';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import { initialQueriesMap } from 'constants/queryBuilder';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useDeleteView } from 'hooks/saveViews/useDeleteView';
import { useNotifications } from 'hooks/useNotifications';
import { useCallback } from 'react';

import { MenuItemContainer } from './styles';

function MenuItemGenerator({
	viewName,
	createdBy,
	uuid,
	refetchAllView,
	onMenuItemSelectHandler,
}: MenuItemLabelGeneratorProps): JSX.Element {
	const { redirectWithQueryBuilderData } = useQueryBuilder();

	const { notifications } = useNotifications();

	const { mutateAsync } = useDeleteView(uuid);

	const onDeleteHandler = useCallback(async () => {
		try {
			await mutateAsync(uuid);
			refetchAllView();
			redirectWithQueryBuilderData(initialQueriesMap.metrics, {
				viewName: 'Query Builder',
			});
			notifications.success({
				message: 'View Deleted Successfully',
			});
		} catch (err) {
			notifications.error({
				message: axios.isAxiosError(err) ? err.message : SOMETHING_WENT_WRONG,
			});
		}
	}, [
		mutateAsync,
		notifications,
		redirectWithQueryBuilderData,
		refetchAllView,
		uuid,
	]);

	const onLabelClickHandler = (): void => {
		onMenuItemSelectHandler({
			key: uuid,
		});
	};

	return (
		<MenuItemContainer>
			<Row justify="space-between">
				<Col span={22} onClick={onLabelClickHandler}>
					<Row>
						<Typography.Text strong>{viewName}</Typography.Text>
					</Row>
					<Row>
						<Typography.Text type="secondary">Created by {createdBy}</Typography.Text>
					</Row>
				</Col>
				<Col span={2}>
					<Typography.Link>
						<DeleteOutlined onClick={onDeleteHandler} />
					</Typography.Link>
				</Col>
			</Row>
		</MenuItemContainer>
	);
}

interface MenuItemLabelGeneratorProps {
	viewName: string;
	createdBy: string;
	uuid: string;
	refetchAllView: VoidFunction;
	onMenuItemSelectHandler: ({ key }: { key: string }) => void;
}

export default MenuItemGenerator;
