import {
	DeleteOutlined,
	EditFilled,
	FullscreenOutlined,
} from '@ant-design/icons';
import history from 'lib/history';
import React, { useCallback } from 'react';
import { useLocation } from 'react-router';
import { Widgets } from 'types/api/dashboard/getAll';

import { Container } from './styles';

function Bar({
	widget,
	onViewFullScreenHandler,
	onDeleteHandler,
}: BarProps): JSX.Element {
	const { pathname } = useLocation();

	const onEditHandler = (): void => {
		const widgetId = widget.id;
		history.push(
			`${pathname}/new?widgetId=${widgetId}&graphType=${widget.panelTypes}`,
		);
	};

	return (
		<Container>
			<FullscreenOutlined onClick={onViewFullScreenHandler} />
			<EditFilled onClick={onEditHandler} />
			<DeleteOutlined onClick={onDeleteHandler} />
		</Container>
	);
}

interface BarProps {
	widget: Widgets;
	onViewFullScreenHandler: () => void;
	onDeleteHandler: () => void;
}

export default Bar;
