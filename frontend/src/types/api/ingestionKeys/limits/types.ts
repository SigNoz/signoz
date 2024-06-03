export interface LimitProps {
	keyId: string;
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
