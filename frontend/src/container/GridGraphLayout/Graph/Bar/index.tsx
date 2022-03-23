import {
	DeleteOutlined,
	EditFilled,
	FullscreenOutlined,
} from '@ant-design/icons';
import history from 'lib/history';
import React from 'react';
import { Widgets } from 'types/api/dashboard/getAll';

import { Container } from './styles';

function Bar({
	widget,
	onViewFullScreenHandler,
	onDeleteHandler,
}: BarProps): JSX.Element {
	const onEditHandler = (): void => {
		const widgetId = widget.id;
		history.push(
			`${window.location.pathname}/new?widgetId=${widgetId}&graphType=${widget.panelTypes}`,
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
