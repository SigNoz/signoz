export function replaceIncorrectObjectFields<TargetValue, ResultValue>(
	targetObject: TargetValue,
	defaultObject: ResultValue,
): { isValid: boolean; validData: ResultValue } {
	const targetValue = targetObject as Record<string, unknown>;
	const defaultValue = defaultObject as Record<string, unknown>;

	const targetObjectKeys = Object.keys(targetValue);
	const defaultObjectKeys = Object.keys(defaultValue);

	let isValid = true;

	const result = { ...defaultValue };

	defaultObjectKeys.forEach((key) => {
		if (targetObjectKeys.includes(key)) {
			result[key as keyof Record<string, unknown>] = targetValue[
				key
			] as ResultValue[keyof ResultValue];
		} else {
			isValid = false;
		}
	});

	return { isValid, validData: result as ResultValue };
}
