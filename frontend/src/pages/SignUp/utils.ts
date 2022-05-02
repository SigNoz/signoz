/**
 * @function
 * @description to check whether password is valid or not
 * @reference stackoverflow.com/a/69807687
 * @returns Boolean
 */
export const isPasswordValid = (value: string): boolean => {
	// eslint-disable-next-line prefer-regex-literals
	const pattern = new RegExp(
		'^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$',
	);
	return pattern.test(value);
};

export const isPasswordNotValidMessage = `Password must have min 8 char with one lower case and one upper and one special char`;
