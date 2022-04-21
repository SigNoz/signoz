import ROUTES from 'constants/routes';
import { ROLES } from 'types/roles';

const routes: RoutesPermission[] = [
	{
		path: ROUTES.DASHBOARD,
		permission: ['ADMIN'],
	},
];

interface RoutesPermission {
	path: string;
	permission: ROLES[];
}

export default routes;
