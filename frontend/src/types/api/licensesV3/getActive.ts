export enum LicenseEvent {
	FAILED_PAYMENT = 'FAILED_PAYMENT',
}

export type LicenseV3EventQueueResModel = {
	event: keyof LicenseEvent;
	status: string;
	scheduled_at: string;
	created_at: string;
	updated_at: string;
};

export type LicenseV3ResModel = {
	status: string;
	state: string;
	event_queue: LicenseV3EventQueueResModel;
};
