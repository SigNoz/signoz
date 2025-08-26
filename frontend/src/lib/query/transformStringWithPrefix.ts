type TransformStringWithPrefixParams = {
	str: string;
	prefix: string;
};

export const transformStringWithPrefix = ({
	str,
	prefix,
}: TransformStringWithPrefixParams): string => {
	if (prefix) {
		return `${prefix}_${str}`;
	}
	return str;
};
