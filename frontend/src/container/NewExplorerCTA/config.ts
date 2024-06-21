import ROUTES from 'constants/routes';

export const RIBBON_STYLES = {
	top: '-0.75rem',
};

export const buttonText: Record<string, string> = {
	[ROUTES.LOGS_EXPLORER]: 'Switch to Old Logs Explorer',
	[ROUTES.TRACE]: 'Try new Traces Explorer',
	[ROUTES.OLD_LOGS_EXPLORER]: 'Switch to New Logs Explorer',
	[ROUTES.TRACES_EXPLORER]: 'Switch to Old Trace Explorer',
};
