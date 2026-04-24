export interface GlobalConfigData {
	external_url: string;
	ingestion_url: string;
	mcp_url: string | null;
}

export interface GlobalConfigDataProps {
	status: string;
	data: GlobalConfigData;
}
