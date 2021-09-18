import {
	DeleteOutlined,
	EditFilled,
	FullscreenOutlined,
} from '@ant-design/icons';
import React, { useCallback } from 'react';
import { useHistory, useLocation } from 'react-router';
import { Widgets } from 'types/api/dashboard/getAll';

import { Container } from './styles';

const Bar = ({
	widget,
	onViewFullScreenHandler,
	onDeleteHandler,
}: BarProps): JSX.Element => {
	const { push } = useHistory();
	const { pathname } = useLocation();

	const onEditHandler = useCallback(() => {
		const widgetId = widget.id;
		push(`${pathname}/new?widgetId=${widgetId}&graphType=${widget.panelTypes}`);
	}, [push, pathname, widget]);

	return (
		<Container>
			<FullscreenOutlined onClick={onViewFullScreenHandler} />
			<EditFilled onClick={onEditHandler} />
			<DeleteOutlined onClick={onDeleteHandler} />
		</Container>
	);
};

interface BarProps {
	widget: Widgets;
	onViewFullScreenHandler: () => void;
	onDeleteHandler: () => void;
}

export default Bar;
