export enum VIEWS {
	METRICS = 'metrics',
	LOGS = 'logs',
	TRACES = 'traces',
	CONTAINERS = 'containers',
	PROCESSES = 'processes',
}

export const VIEW_TYPES = {
	METRICS: VIEWS.METRICS,
	LOGS: VIEWS.LOGS,
	TRACES: VIEWS.TRACES,
	CONTAINERS: VIEWS.CONTAINERS,
	PROCESSES: VIEWS.PROCESSES,
};

export const FEATURE_COMING_SOON_STRINGS = {
	CONTAINERS_VISUALIZATION_MESSAGE:
		'The ability to visualise containers is in active development and should be available to you soon.',
	PROCESSES_VISUALIZATION_MESSAGE:
		'The ability to visualise processes is in active development and should be available to you soon.',
	WORKING_MESSAGE:
		"We're working to extend infrastructure monitoring to take care of a bunch of different cases. Thank you for your patience.",
	WAITLIST_MESSAGE: 'Join the waitlist for early access or contact support.',
	CONTACT_SUPPORT: 'Contact Support',
} as const;
