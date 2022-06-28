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

export interface ITagKeyValueQuery {
	id: string;
	key: string;
	op: string;
	value: string[];
}
