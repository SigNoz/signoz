export interface LimitConfig {
	size?: number;
	count?: number; // mainly used for metrics
	enabled?: boolean;
}

export interface LimitSettings {
	day?: LimitConfig;
	second?: LimitConfig;
}

export interface LimitProps {
	id: string;
	signal: string;
	tags?: string[];
	key_id?: string;
	created_at?: string;
	updated_at?: string;
	config?: LimitSettings;
	metric?: LimitSettings;
}

export interface AddLimitProps {
	keyID: string;
	signal: string;
	config: LimitSettings;
}

export interface UpdateLimitProps {
	limitID: string;
	signal: string;
	config: LimitSettings;
}

export interface LimitSuccessProps {
	status: string;
	response: unknown;
}
