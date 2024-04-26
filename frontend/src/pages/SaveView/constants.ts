import ROUTES from 'constants/routes';

export const SOURCEPAGE_VS_ROUTES: {
	[key: string]: Partial<typeof ROUTES[keyof typeof ROUTES]>;
} = {
	logs: ROUTES.LOGS_EXPLORER,
	traces: ROUTES.TRACES_EXPLORER,
} as const;

export const ROUTES_VS_SOURCEPAGE: {
	[key: string]: string;
} = {
	[ROUTES.LOGS_SAVE_VIEWS]: 'logs',
	[ROUTES.TRACES_SAVE_VIEWS]: 'traces',
} as const;
