export type PayloadVariables = Record<
	string,
	undefined | null | string | number | boolean | (string | number | boolean)[]
>;

export type Props = {
	query: string;
	variables: PayloadVariables;
};

export type PayloadProps = {
	variableValues: string[] | number[];
};
