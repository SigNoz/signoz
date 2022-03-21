import { Button } from 'antd';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import React from 'react';
import { generatePath } from 'react-router-dom';

import { Data } from '..';

const Name = (name: Data['name'], data: Data): JSX.Element => {
	const onClickHandler = () => {
		history.push(
			generatePath(ROUTES.DASHBOARD, {
				dashboardId: data.id,
			}),
		);
	};

	return (
		<Button onClick={onClickHandler} type="link">
			{name}
		</Button>
	);
};

export default Name;
