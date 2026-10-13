/** A variable's selected value as the variable-values API accepts it. */
type VariableValue =
	| null
	| string
	| number
	| boolean
	| (string | number | boolean)[]
	| undefined;

export type PayloadVariables = Record<string, VariableValue>;

export type Props = {
	query: string;
	variables: PayloadVariables;
};

export type VariableResponseProps = {
	variableValues: string[] | number[];
};
