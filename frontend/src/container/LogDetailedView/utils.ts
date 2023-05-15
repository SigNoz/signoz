export const recursiveParseJSON = (obj: string): Record<string, unknown> => {
	try {
		const value = JSON.parse(obj);
		if (typeof value === 'string') {
			return recursiveParseJSON(value);
		}
		if (typeof value === 'object') {
			Object.entries(value).forEach(([key, val]) => {
				if (typeof val === 'string') {
					value[key] = val.trim();
				} else if (typeof val === 'object') {
					value[key] = recursiveParseJSON(JSON.stringify(val));
				}
			});
		}
		return value;
	} catch (e) {
		return {};
	}
};
