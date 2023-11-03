import { LockFilled } from '@ant-design/icons';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import { generatePath } from 'react-router-dom';

import { Data } from '..';
import { TableLinkText } from './styles';

function Name(name: Data['name'], data: Data): JSX.Element {
	const { id: DashboardId, isLocked } = data;

	const onClickHandler = (): void => {
		history.push(
			generatePath(ROUTES.DASHBOARD, {
				dashboardId: DashboardId,
			}),
		);
	};

	return (
		<TableLinkText onClick={onClickHandler}>
			{isLocked && <LockFilled />} {name}
		</TableLinkText>
	);
}

export default Name;
