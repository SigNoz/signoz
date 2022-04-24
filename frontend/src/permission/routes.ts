import ROUTES from 'constants/routes';
import { ROLES } from 'types/roles';

const routes: RoutesPermission[] = [
	{
		path: ROUTES.DASHBOARD,
		permission: ['ADMIN'],
		isLoggedInRequired: true,
	},
	{
		path: ROUTES.SIGN_UP,
		permission: ['ADMIN', 'EDITOR', 'VIEWER'],
		isLoggedInRequired: false,
		redirectIfLoggedIn: true,
	},
	{
		path: ROUTES.LOGIN,
		permission: ['ADMIN', 'EDITOR', 'VIEWER'],
		isLoggedInRequired: false,
		redirectIfLoggedIn: true,
	},
];

interface RoutesPermission {
	path: string;
	permission: ROLES[];
	isLoggedInRequired: boolean;
	redirectIfLoggedIn?: boolean;
}

export default routes;
