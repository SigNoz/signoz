export type TOperator = '=' | '!=';

export type TCategory = 'title' | 'description' | 'tags';
export interface IQueryStructure {
	category: string;
	id: string;
	operator: TOperator;
	value: string | string[];
}

interface IOptions {
	name: string;
	value?: string;
}
export interface IOptionsData {
	mode: undefined | 'tags' | 'multiple';
	options: IOptions[] | [];
}
