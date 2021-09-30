function formatNumber(labelValue: number | string): string {
	const value = Math.abs(Number(labelValue));

	if (value >= 1.0e9) {
		return `${(value / 1.0e9).toFixed(2)}B`;
	}

	if (value >= 1.0e6) {
		return `${(value / 1.0e6).toFixed(2)}M`;
	}

	if (value >= 1.0e3) {
		return `${(value / 1.0e3).toFixed(2)}K`;
	}

	return value.toString();
}

export default formatNumber;
