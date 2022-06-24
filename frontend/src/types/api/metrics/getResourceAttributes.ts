export type TagKeyProps = {
	match?: string;
	metricName: string;
};
export type TagKeysPayloadProps = {
	data: string[];
};

export type TagValueProps = {
	tagKey: string;
	metricName: string;
};
export type TagValuesPayloadProps = {
	data: string[];
};
