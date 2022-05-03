export interface IOption {
	label: string;
	value: string;
}

export interface IResourceAttributeQuery {
	id: string;
	tagKey: string;
	operator: string;
	tagValue: string[];
}
