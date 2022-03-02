import {
	DeleteOutlined,
	EditFilled,
	FullscreenOutlined,
} from '@ant-design/icons';
import React, { useCallback } from 'react';
import { useLocation } from 'react-router';
import { Widgets } from 'types/api/dashboard/getAll';

import { Container } from './styles';
import history from 'lib/history';

const Bar = ({
	widget,
	onViewFullScreenHandler,
	onDeleteHandler,
}: BarProps): JSX.Element => {
	const { pathname } = useLocation();

	const onEditHandler = useCallback(() => {
		const widgetId = widget.id;
		history.push(
			`${pathname}/new?widgetId=${widgetId}&graphType=${widget.panelTypes}`,
		);
	}, [pathname, widget]);

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
