export interface IOption {
	label: string;
	value: string;
}

export interface IMetricBuilderTagKeyQuery {
	id: string;
	tagKey: string;
	operator: string;
	tagValue: string[];
}
