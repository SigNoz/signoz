export type PayloadVariables = Record<
	string,
	undefined | null | string | string[]
>;

export type Props = {
	query: string;
	variables: PayloadVariables;
};

export type PayloadProps = {
	variableValues: string[] | number[];
};
