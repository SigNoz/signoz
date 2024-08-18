export function calculateChange(
	totalCurrentTriggers: number | undefined,
	totalPastTriggers: number | undefined,
): { changePercentage: number; changeDirection: number } {
	if (
		totalCurrentTriggers === undefined ||
		totalPastTriggers === undefined ||
		totalPastTriggers === 0
	) {
		return { changePercentage: 0, changeDirection: 0 };
	}

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
