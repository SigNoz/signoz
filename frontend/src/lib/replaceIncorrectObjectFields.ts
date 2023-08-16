export function replaceIncorrectObjectFields<
	// eslint-disable-next-line @typescript-eslint/ban-types
	TargetValue extends object,
	// eslint-disable-next-line @typescript-eslint/ban-types
	ResultValue extends object
>(
	targetObject: TargetValue,
	defaultObject: ResultValue,
): { isValid: boolean; validData: ResultValue } {
	const targetObjectKeys = Object.keys(targetObject);
	const defaultObjectKeys = Object.keys(defaultObject);

	let isValid = true;

	const result: ResultValue = { ...defaultObject };

	defaultObjectKeys.forEach((key) => {
		if (targetObjectKeys.includes(key)) {
			result[key as keyof ResultValue] = (targetObject[
				key as keyof TargetValue
			] as unknown) as ResultValue[keyof ResultValue];
		} else {
			isValid = false;
		}
	});

	return { isValid, validData: result };
}
