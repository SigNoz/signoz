import ROUTES from 'constants/routes';

export const RIBBON_STYLES = {
	top: '-0.75rem',
};

export const buttonText: Record<string, string> = {
	[ROUTES.LOGS_EXPLORER]: 'Old UI',
	[ROUTES.TRACE]: 'New UI',
	[ROUTES.OLD_LOGS_EXPLORER]: 'New UI',
	[ROUTES.TRACES_EXPLORER]: 'Old UI',
};
