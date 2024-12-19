import { NEW_ROUTES_MENU_ITEM_KEY_MAP } from './menuItems';

export const getActiveMenuKeyFromPath = (pathname: string): string => {
	const basePath = pathname?.split('/')?.[1]; // Get the base path, Eg; /dashboard/dc5beb63-589c-46a3-ad4c-1b9ca248ee33 -> dashboard

	if (!basePath) return '';

	const baseRoute = `/${basePath}`;

	return (NEW_ROUTES_MENU_ITEM_KEY_MAP[baseRoute] as string) || baseRoute;
};
