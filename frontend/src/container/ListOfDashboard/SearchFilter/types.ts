export type TOperator = '=' | '!=';
export interface IQueryStructure {
	category: string;
	id: string;
	operator: TOperator;
	value: string | string[];
}
