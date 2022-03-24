import { Button } from 'antd';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import React from 'react';
import { generatePath } from 'react-router-dom';

import { Data } from '..';

function Name(name: Data['name'], data: Data): JSX.Element {
	const onClickHandler = (): void => {
		const { id: DashboardId } = data;

		history.push(
			generatePath(ROUTES.DASHBOARD, {
				dashboardId: DashboardId,
			}),
		);
	};

	return (
		<Button onClick={onClickHandler} type="link">
			{name}
		</Button>
	);
}

export default Name;
