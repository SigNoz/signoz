import ROUTES from 'constants/routes';

export const SOURCEPAGE_VS_ROUTES: {
	[key: string]: Partial<typeof ROUTES[keyof typeof ROUTES]>;
} = {
	logs: ROUTES.LOGS_EXPLORER,
	traces: ROUTES.TRACES_EXPLORER,
} as const;
