export interface LimitProps {
	id: string;
	signal: string;
	tags?: string[];
	key_id?: string;
	created_at?: string;
	updated_at?: string;
	config?: {
		day?: {
			size?: number;
			enabled?: boolean;
		};
		second?: {
			size?: number;
			enabled?: boolean;
		};
	};
	metric?: {
		day?: {
			size?: number;
			enabled?: boolean;
		};
		second?: {
			size?: number;
			enabled?: boolean;
		};
	};
}

export interface AddLimitProps {
	keyID: string;
	signal: string;
	config: {
		day?: {
			size?: number;
			enabled?: boolean;
		};
		second?: {
			size?: number;
			enabled?: boolean;
		};
	};
}

export interface UpdateLimitProps {
	limitID: string;
	signal: string;
	config: {
		day?: {
			size?: number;
			enabled?: boolean;
		};
		second?: {
			size?: number;
			enabled?: boolean;
		};
	};
}

export interface LimitSuccessProps {
	status: string;
	response: unknown;
}
