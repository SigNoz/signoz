export const getStepInterval = (startTime: number, endTime: number): number => {
	const diffInMinutes = (endTime - startTime) / 1000000 / (60 * 1000); // Convert to minutes

	if (diffInMinutes <= 15) {
		return 60;
	} // 15 min or less
	if (diffInMinutes <= 30) {
		return 60;
	} // 30 min or less
	if (diffInMinutes <= 60) {
		return 120;
	} // 1 hour or less
	if (diffInMinutes <= 360) {
		return 520;
	} // 6 hours or less
	if (diffInMinutes <= 1440) {
		return 2440;
	} // 1 day or less
	if (diffInMinutes <= 10080) {
		return 10080;
	} // 1 week or less
	return 54000; // More than a week (use monthly interval)
};

