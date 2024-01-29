export const removeSourcePageFromPath = (path: string): string => {
	const lastSlashIndex = path.lastIndexOf('/');
	if (lastSlashIndex !== -1) {
		return path.substring(0, lastSlashIndex);
	}
	return path;
};
