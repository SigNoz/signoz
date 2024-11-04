export const formatNanoToMS = (nanoSeconds: number): string => {
	const milliseconds = nanoSeconds / 1_000_000;
	return `${milliseconds.toFixed(0)}ms`;
};
