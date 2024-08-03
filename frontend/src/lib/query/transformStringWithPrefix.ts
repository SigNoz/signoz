type TransformStringWithPrefixParams = {
	str: string;
	prefix: string;
	condition: boolean;
	isLogsExplorerPage?: boolean;
};

// update this to default false and pass correct true values from consumer
export const transformStringWithPrefix = ({
	str,
	prefix,
	condition,
	isLogsExplorerPage = true,
}: TransformStringWithPrefixParams): string => {
	if (prefix) {
		if (isLogsExplorerPage) {
			return `${prefix}_${str}`;
		}
		return condition ? `${prefix}_${str}` : str;
	}
	return str;
};
