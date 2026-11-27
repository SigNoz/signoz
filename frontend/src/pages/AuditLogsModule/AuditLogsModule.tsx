import { useLocation } from 'react-use';
import RouteTab from 'components/RouteTab';
import { TabRoutes } from 'components/RouteTab/types';

import { auditLogsExplorer } from './constants';

import styles from './AuditLogsModule.module.scss';

const routes: TabRoutes[] = [auditLogsExplorer];

export default function AuditLogsModule(): JSX.Element {
	const { pathname } = useLocation();

	return (
		<RouteTab
			className={styles.auditLogsModule}
			routes={routes}
			activeKey={pathname}
		/>
	);
}
