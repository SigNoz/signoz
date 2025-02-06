export enum LicenseEvent {
	NO_EVENT = '',
	DEFAULT = 'DEFAULT',
}

export enum LicenseStatus {
	SUSPENDED = 'SUSPENDED',
	VALID = 'VALID',
}

export enum LicenseState {
	DEFAULTED = 'DEFAULTED',
	ACTIVE = 'ACTIVE',
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
	status: LicenseStatus;
	state: LicenseState;
	event_queue: LicenseV3EventQueueResModel;
};
