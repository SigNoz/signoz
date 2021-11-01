import { Button } from 'antd';
import ROUTES from 'constants/routes';
import React, { useCallback } from 'react';
import { generatePath, useHistory } from 'react-router-dom';

import { Data } from '..';

const Name = (name: Data['name'], data: Data): JSX.Element => {
	const { push } = useHistory();

	const onClickHandler = useCallback(() => {
		push(
			generatePath(ROUTES.DASHBOARD, {
				dashboardId: data.id,
			}),
		);
	}, [data.id, push]);

	return (
		<Button onClick={onClickHandler} type="link">
			{name}
		</Button>
	);
};

export default Name;
