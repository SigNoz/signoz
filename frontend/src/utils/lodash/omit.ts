export const omit = (
	keys: string | string[],
	obj: Record<string, string>,
): { [x: string]: string } => {
	if (typeof keys === 'string') {
		const { [keys]: value, ...rest } = obj;
		return rest;
	}

	return Object.fromEntries(
		Object.entries(obj).filter(([key]) => !keys.includes(key)),
	);
};
