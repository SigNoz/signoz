export function calculateChange(
	totalCurrentTriggers: number | undefined,
	totalPastTriggers: number | undefined,
): { changePercentage: number; changeDirection: number } {
	if (
		totalCurrentTriggers === undefined ||
		totalPastTriggers === undefined ||
		[0, '0'].includes(totalPastTriggers)
	) {
		return { changePercentage: 0, changeDirection: 0 };
	}

	let changePercentage =
		((totalCurrentTriggers - totalPastTriggers) / totalPastTriggers) * 100;

	let changeDirection = 0;

	if (changePercentage < 0) {
		changeDirection = -1;
	} else if (changePercentage > 0) {
		changeDirection = 1;
	}

	changePercentage = Math.abs(changePercentage);
	changePercentage = Math.round(changePercentage);

	return {
		changePercentage,
		changeDirection,
	};
}
