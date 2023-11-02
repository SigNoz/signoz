import { LockFilled } from '@ant-design/icons';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { generatePath } from 'react-router-dom';

import { Data } from '..';
import { TableLinkText } from './styles';

function Name(name: Data['name'], data: Data): JSX.Element {
	const { isDashboardLocked } = useDashboard();
	const onClickHandler = (): void => {
		const { id: DashboardId } = data;

		history.push(
			generatePath(ROUTES.DASHBOARD, {
				dashboardId: DashboardId,
			}),
		);
	};

	return (
		<TableLinkText onClick={onClickHandler}>
			{isDashboardLocked && <LockFilled />} {name}
		</TableLinkText>
	);
}

export default Name;
