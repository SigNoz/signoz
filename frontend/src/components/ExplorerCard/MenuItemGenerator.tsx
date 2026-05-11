import { MouseEvent, useCallback } from 'react';
import { Trash2 } from '@signozhq/icons';
import { Col, Row, Tooltip } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useDeleteView } from 'hooks/saveViews/useDeleteView';
import { useHandleExplorerTabChange } from 'hooks/useHandleExplorerTabChange';
import { useNotifications } from 'hooks/useNotifications';

import { MenuItemContainer } from './styles';
import { MenuItemLabelGeneratorProps } from './types';
import {
	deleteViewHandler,
	getViewDetailsUsingViewKey,
	trimViewName,
} from './utils';

function MenuItemGenerator({
	viewName,
	viewKey,
	createdBy,
	uuid,
	viewData,
	refetchAllView,
	sourcePage,
}: MenuItemLabelGeneratorProps): JSX.Element {
	const { panelType, redirectWithQueryBuilderData, updateAllQueriesOperators } =
		useQueryBuilder();
	const { handleExplorerTabChange } = useHandleExplorerTabChange();

	const { notifications } = useNotifications();

	const { mutateAsync: deleteViewAsync } = useDeleteView(uuid);

	const onDeleteHandler = (event: MouseEvent<SVGSVGElement>): void => {
		event.stopPropagation();
		deleteViewHandler({
			deleteViewAsync,
			notifications,
			panelType,
			redirectWithQueryBuilderData,
			refetchAllView,
			viewId: uuid,
			viewKey,
			updateAllQueriesOperators,
			sourcePage,
		});
	};

	const onMenuItemSelectHandler = useCallback(
		({ key }: { key: string }): void => {
			const currentViewDetails = getViewDetailsUsingViewKey(key, viewData);
			if (!currentViewDetails) {
				return;
			}
			const { query, name, id, panelType: currentPanelType } = currentViewDetails;

			handleExplorerTabChange(currentPanelType, {
				query,
				name,
				id,
			});
		},
		[viewData, handleExplorerTabChange],
	);

	const onLabelClickHandler = (): void => {
		onMenuItemSelectHandler({
			key: uuid,
		});
	};

	const newViewName = trimViewName(viewName);

	return (
		<MenuItemContainer onClick={onLabelClickHandler}>
			<Row justify="space-between">
				<Col span={22}>
					<Row>
						<Tooltip title={viewName}>
							<Typography.Text strong>{newViewName}</Typography.Text>
						</Tooltip>
					</Row>
					<Row>
						<Typography.Text color="muted">Created by {createdBy}</Typography.Text>
					</Row>
				</Col>
				<Col span={2}>
					<Typography.Link>
						<Trash2
							role="img"
							aria-label="Delete view"
							onClick={onDeleteHandler}
							size="md"
						/>
					</Typography.Link>
				</Col>
			</Row>
		</MenuItemContainer>
	);
}

export default MenuItemGenerator;
