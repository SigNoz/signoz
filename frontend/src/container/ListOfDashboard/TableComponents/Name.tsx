import { Button } from 'antd';
import ROUTES from 'constants/routes';
import updateUrl from 'lib/updateUrl';
import React, { useCallback } from 'react';
import { useHistory } from 'react-router-dom';

import { Data } from '..';

const Name = (name: Data['name'], data: Data): JSX.Element => {
	const { push } = useHistory();

	const onClickHandler = useCallback(() => {
		push(updateUrl(ROUTES.DASHBOARD, ':dashboardId', data.id));
	}, []);

	return (
		<Button onClick={onClickHandler} type="link">
			{name}
		</Button>
	);
};

export default Name;
