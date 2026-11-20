export interface IngestionInfo {
	keyId: string;
	name: string;
	createdAt: string;
	ingestionKey: string;
	ingestionURL: string;
	dataRegion: string;
}

export interface IngestionResponseProps {
	payload: IngestionInfo[];
}

export interface IngestionDataType {
	key: string;
	name: string;
	value: string;
}
