import { screen } from 'tests/test-utils';

export const testLabelInputAndHelpValue = ({
	labelText,
	testId,
	helpText,
	required = false,
	value,
}: {
	labelText: string;
	testId: string;
	helpText?: string;
	required?: boolean;
	value?: string;
}): void => {
	const label = screen.getByText(labelText);
	expect(label).toBeInTheDocument();

	const input = screen.getByTestId(testId);
	expect(input).toBeInTheDocument();

	if (helpText !== undefined) {
		expect(screen.getByText(helpText)).toBeInTheDocument();
	}
	if (required) {
		expect(input).toBeRequired();
	}
	if (value) {
		expect(input).toHaveValue(value);
	}
};
