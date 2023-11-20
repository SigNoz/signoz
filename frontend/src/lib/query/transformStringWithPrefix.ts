type TransformStringWithPrefixParams = {
	str: string;
	prefix: string;
	condition: boolean;
};

export const transformStringWithPrefix = ({
	str,
	prefix,
	condition,
}: TransformStringWithPrefixParams): string => {
	if (prefix) {
		return condition ? `${prefix}_${str}` : str;
	}
	return str;
};
