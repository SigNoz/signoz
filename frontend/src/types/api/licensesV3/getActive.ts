export enum LicenseEvent {
	FAILED_PAYMENT = 'FAILED_PAYMENT',
}

export enum LicenseState {
	SUSPENDED = 'SUSPENDED',
}

export type LicenseV3EventQueueResModel = {
	event: LicenseEvent;
	status: string;
	scheduled_at: string;
	created_at: string;
	updated_at: string;
};

export type LicenseV3ResModel = {
	key: string;
	status: string;
	state: LicenseState;
	event_queue: LicenseV3EventQueueResModel;
};
