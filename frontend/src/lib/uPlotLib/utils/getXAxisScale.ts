function getFallbackMinMaxTimeStamp(): {
	fallbackMin: number;
	fallbackMax: number;
} {
	const currentDate = new Date();
	// Get the Unix timestamp (milliseconds since January 1, 1970)
	const currentTime = currentDate.getTime();
	const currentUnixTimestamp = Math.floor(currentTime / 1000);

	// Calculate the date and time one day ago
	const oneDayAgoUnixTimestamp = Math.floor(
		(currentDate.getTime() - 86400000) / 1000,
	); // 86400000 milliseconds in a day

	return {
		fallbackMin: oneDayAgoUnixTimestamp,
		fallbackMax: currentUnixTimestamp,
	};
}

export const getXAxisScale = (
	minTimeScale: number,
	maxTimeScale: number,
): {
	time: boolean;
	auto: boolean;
	range?: [number, number];
} => {
	let minTime = minTimeScale;
	let maxTime = maxTimeScale;

	if (!minTimeScale || !maxTimeScale) {
		const { fallbackMin, fallbackMax } = getFallbackMinMaxTimeStamp();

		minTime = fallbackMin;
		maxTime = fallbackMax;
	}

	return { time: true, auto: false, range: [minTime, maxTime] };
};
