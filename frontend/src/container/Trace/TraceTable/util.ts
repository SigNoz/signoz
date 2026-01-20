export const getSpanOrderParam = (key: string): string => {
	if (key === 'durationNano' || key === 'duration_nano') {
		return 'duration';
	}
	if (key === 'timestamp') {
		return 'timestamp';
	}
	return '';
};

export const getSpanOrder = (order: string): string => {
	if (order === 'ascend') {
		return 'ascending';
	}
	if (order === 'descend') {
		return 'descending';
	}
	return '';
};
