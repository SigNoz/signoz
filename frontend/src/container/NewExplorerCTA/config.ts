import ROUTES from 'constants/routes';

export const RIBBON_STYLES = {
	top: '-0.75rem',
};

export const buttonText: Record<string, string> = {
	[ROUTES.LOGS_EXPLORER]: 'Old Explorer',
	[ROUTES.TRACE]: 'New Explorer',
	[ROUTES.OLD_LOGS_EXPLORER]: 'New Explorer',
	[ROUTES.TRACES_EXPLORER]: 'Old Explorer',
};
