export interface IField {
	name: string;
	type: string;
	dataType: string;
}

export interface IFields {
	selected: ISelectedFields[];
	interesting: IInterestingFields[];
}
export type ISelectedFields = IField;
export type IInterestingFields = IField;

export type IFieldMoveToSelected = IField & {
	selected: boolean;
};
