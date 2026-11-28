import { Compass } from '@signozhq/icons';
import Loadable from 'components/Loadable';
import { TabRoutes } from 'components/RouteTab/types';
import ROUTES from 'constants/routes';

import styles from './AuditLogsModule.module.scss';

const AuditLogsExplorer = Loadable(() => import('pages/AuditLogs'));

export const auditLogsExplorer: TabRoutes = {
	Component: AuditLogsExplorer,
	name: (
		<div className={styles.tabItem}>
			<Compass size={16} /> Explorer
		</div>
	),
	route: ROUTES.AUDIT_LOGS,
	key: ROUTES.AUDIT_LOGS,
};
