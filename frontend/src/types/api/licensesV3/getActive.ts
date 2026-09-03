export enum LicenseEvent {
	NO_EVENT = '',
	DEFAULT = 'default',
}

export enum LicenseStatus {
	SUSPENDED = 'suspended',
	VALID = 'valid',
	INVALID = 'invalid',
}

export enum LicenseState {
	DEFAULTED = 'defaulted',
	ACTIVATED = 'activated',
	EXPIRED = 'expired',
	ISSUED = 'issued',
	EVALUATING = 'evaluating',
	EVALUATION_EXPIRED = 'evaluation_expired',
	TERMINATED = 'terminated',
	CANCELLED = 'cancelled',
}

export enum LicensePlatform {
	SELF_HOSTED = 'self_hosted',
	CLOUD = 'cloud',
}

export type LicensePlanResModel = {
	id: string;
	name: string;
	description: string;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
};

export type LicenseEventQueueResModel = {
	event: LicenseEvent;
	status: string;
	scheduledAt: string;
	createdAt: string;
	updatedAt: string;
};

export type LicenseResModel = {
	id: string;
	status: LicenseStatus;
	state: LicenseState;
	platform: LicensePlatform;
	plan: LicensePlanResModel;
	eventQueue: LicenseEventQueueResModel;
	freeUntil: string;
	createdAt: string;
	updatedAt: string;
	validFrom: number;
	validUntil: number;
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
