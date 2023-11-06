export interface ApDexPayloadAndSettingsProps {
	servicename: string;
	threshold: number;
	excludeStatusCode: string;
}

export interface SetApDexPayloadProps {
	data: string;
}

export interface MetricMetaProps {
	delta: boolean;
	le: number[] | null;
}
