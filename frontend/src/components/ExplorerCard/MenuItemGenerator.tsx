import { DeleteOutlined } from '@ant-design/icons';
import { Col, Row, Typography } from 'antd';
import { useGetPanelTypesQueryParam } from 'hooks/queryBuilder/useGetPanelTypesQueryParam';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useDeleteView } from 'hooks/saveViews/useDeleteView';
import { useNotifications } from 'hooks/useNotifications';
import { useCallback } from 'react';

import { MenuItemContainer } from './styles';
import { deleteViewHandler } from './utils';

function MenuItemGenerator({
	viewName,
	viewKey,
	createdBy,
	uuid,
	refetchAllView,
	onMenuItemSelectHandler,
}: MenuItemLabelGeneratorProps): JSX.Element {
	const { redirectWithQueryBuilderData } = useQueryBuilder();
	const panelType = useGetPanelTypesQueryParam();

	const { notifications } = useNotifications();

	const { mutateAsync: deleteViewAsync } = useDeleteView(uuid);

	const onDeleteHandler = useCallback(async () => {
		deleteViewHandler({
			deleteViewAsync,
			notifications,
			panelType,
			redirectWithQueryBuilderData,
			refetchAllView,
			viewId: uuid,
			viewKey,
		});
	}, [
		deleteViewAsync,
		notifications,
		panelType,
		redirectWithQueryBuilderData,
		refetchAllView,
		uuid,
		viewKey,
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
	viewKey: string;
	createdBy: string;
	uuid: string;
	refetchAllView: VoidFunction;
	onMenuItemSelectHandler: ({ key }: { key: string }) => void;
}

export default MenuItemGenerator;
