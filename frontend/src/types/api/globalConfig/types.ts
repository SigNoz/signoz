export interface GlobalConfigData {
	external_url: string;
	ingestion_url: string;
}

export interface GlobalConfigDataProps {
	status: string;
	data: GlobalConfigData;
}
