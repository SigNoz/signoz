export enum LicenseEvent {
	NO_EVENT = '',
	DEFAULT = 'DEFAULT',
}

export enum LicenseStatus {
	SUSPENDED = 'SUSPENDED',
	VALID = 'VALID',
	INVALID = 'INVALID',
}

export enum LicenseState {
	DEFAULTED = 'DEFAULTED',
	ACTIVE = 'ACTIVE',
	EXPIRED = 'EXPIRED',
	ISSUED = 'ISSUED',
	EVALUATING = 'EVALUATING',
	EVALUATION_EXPIRED = 'EVALUATION_EXPIRED',
	TERMINATED = 'TERMINATED',
	CANCELLED = 'CANCELLED',
}

export enum LicensePlatform {
	SELF_HOSTED = 'SELF_HOSTED',
	CLOUD = 'CLOUD',
}

export type LicenseEventQueueResModel = {
	event: LicenseEvent;
	status: string;
	scheduled_at: string;
	created_at: string;
	updated_at: string;
};

export type LicenseResModel = {
	key: string;
	status: LicenseStatus;
	state: LicenseState;
	event_queue: LicenseEventQueueResModel;
	platform: LicensePlatform;
	created_at: string;
	plan: {
		created_at: string;
		description: string;
		is_active: boolean;
		name: string;
		updated_at: string;
	};
	plan_id: string;
	free_until: string;
	updated_at: string;
	valid_from: number;
	valid_until: number;
};

// Duplicate of old licenses API response, need to improve this later
export type TrialInfo = {
	trialStart: number;
	trialEnd: number;
	onTrial: boolean;
	workSpaceBlock: boolean;
	trialConvertedToSubscription: boolean;
	gracePeriodEnd: number;
};

export interface PayloadProps {
	data: LicenseEventQueueResModel;
	status: string;
}
