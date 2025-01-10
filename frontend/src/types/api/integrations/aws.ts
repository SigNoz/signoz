export interface GenerateConnectionUrlPayload {
	agent_config: {
		region: string;
	};
	account_config: {
		regions: string[];
	};
	account_id?: string;
}

export interface ConnectionUrlResponse {
	connection_url: string;
	account_id: string;
}

export interface AccountStatusResponse {
	status: 'success';
	data: {
		id: string;
		status: {
			integration: {
				last_heartbeat_ts_ms: number | null;
			};
		};
	};
}
