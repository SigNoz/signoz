export function calculateChange(
	totalCurrentTriggers: number,
	totalPastTriggers: number,
): { changePercentage: number; changeDirection: number } {
	let changePercentage =
		((totalCurrentTriggers - totalPastTriggers) / totalPastTriggers) * 100;

	const changeDirection = changePercentage >= 0 ? 1 : -1;

	changePercentage = Math.abs(changePercentage);
	changePercentage = Math.round(changePercentage);

	return {
		changePercentage,
		changeDirection,
	};
}
