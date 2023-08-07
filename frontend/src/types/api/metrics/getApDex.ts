export type ApDexPayloadProps = {
	serviceName: string;
	threshold: number;
	excludeStatusCodes: string;
};

export interface SetApDexSettingsProps {
	servicename: string;
	threshold: number;
	excludeStatusCode: string;
}

export interface SetApDexPayloadProps {
	data: string;
}

export interface MetricMetaProps {
	delta: boolean;
	le: number[];
}
