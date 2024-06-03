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
		};
		second?: {
			size?: number;
		};
	};
	metric?: {
		day?: {
			size?: number;
		};
		second?: {
			size?: number;
		};
	};
}

export interface AddLimitProps {
	keyID: string;
	signal: string;
	config: {
		day: {
			size: number;
		};
		second: {
			size: number;
		};
	};
}

export interface UpdateLimitProps {
	limitID: string;
	signal: string;
	config: {
		day: {
			size: number;
		};
		second: {
			size: number;
		};
	};
}

export interface LimitSuccessProps {
	status: string;
	response: unknown;
}
