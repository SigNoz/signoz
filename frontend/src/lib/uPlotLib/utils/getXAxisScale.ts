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

	// As API response is adjusted to return values for  T - 1 min (end timestamp) due to which graph would not have the current timestamp data, we see the empty space in the graph for smaller timeframe. To accommodate this, we will be plotting the graph from (startTime  ->  endTime - 1 min).

	const oneMinuteAgoTimestamp = (maxTime - 60) * 1000;
	const currentDate = new Date(oneMinuteAgoTimestamp);

	// Set seconds and milliseconds to zero
	currentDate.setSeconds(0);
	currentDate.setMilliseconds(0);

	// Get the Unix timestamp in seconds
	const unixTimestampSeconds = Math.floor(currentDate.getTime() / 1000);
	maxTime = unixTimestampSeconds;

	return { time: true, auto: false, range: [minTime, maxTime] };
};
