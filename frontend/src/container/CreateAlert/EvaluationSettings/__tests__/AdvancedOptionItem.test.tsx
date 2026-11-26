import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import AdvancedOptionItem from '../AdvancedOptionItem/AdvancedOptionItem';

const TEST_INPUT_PLACEHOLDER = 'Test input';
const TEST_TITLE = 'Test Title';
const TEST_DESCRIPTION = 'Test Description';
const TEST_VALUE = 'test value';
const TEST_INPUT_TEST_ID = 'test-input';

describe('AdvancedOptionItem', () => {
	const mockInput = (
		<input
			data-testid={TEST_INPUT_TEST_ID}
			placeholder={TEST_INPUT_PLACEHOLDER}
		/>
	);

	const defaultProps = {
		title: TEST_TITLE,
		description: TEST_DESCRIPTION,
		input: mockInput,
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should render title, description and switch', () => {
		render(
			<AdvancedOptionItem
				title={defaultProps.title}
				description={defaultProps.description}
				input={defaultProps.input}
				defaultShowInput={false}
			/>,
		);

		expect(screen.getByText(TEST_TITLE)).toBeInTheDocument();
		expect(screen.getByText(TEST_DESCRIPTION)).toBeInTheDocument();

		const switchElement = screen.getByRole('switch');
		expect(switchElement).toBeInTheDocument();
		expect(switchElement).not.toBeChecked();
	});

	it('should not show input initially', () => {
		render(
			<AdvancedOptionItem
				title={defaultProps.title}
				description={defaultProps.description}
				input={defaultProps.input}
				defaultShowInput={false}
			/>,
		);

		const inputElement = screen.getByTestId(TEST_INPUT_TEST_ID);
		expect(inputElement).toBeInTheDocument();
		expect(inputElement).not.toBeVisible();
	});

	it('should show input when switch is toggled on', async () => {
		const user = userEvent.setup();
		render(
			<AdvancedOptionItem
				title={defaultProps.title}
				description={defaultProps.description}
				input={defaultProps.input}
				defaultShowInput={false}
			/>,
		);

		const initialInputElement = screen.getByTestId(TEST_INPUT_TEST_ID);
		expect(initialInputElement).toBeInTheDocument();
		expect(initialInputElement).not.toBeVisible();

		const switchElement = screen.getByRole('switch');
		await user.click(switchElement);

		expect(switchElement).toBeChecked();
		const visibleInputElement = screen.getByTestId(TEST_INPUT_TEST_ID);
		expect(visibleInputElement).toBeInTheDocument();
		expect(visibleInputElement).toBeVisible();
	});

	it('should hide input when switch is toggled off', async () => {
		const user = userEvent.setup();
		render(
			<AdvancedOptionItem
				title={defaultProps.title}
				description={defaultProps.description}
				input={defaultProps.input}
				defaultShowInput={false}
			/>,
		);

		const switchElement = screen.getByRole('switch');

		const initialInputElement = screen.getByTestId(TEST_INPUT_TEST_ID);
		expect(initialInputElement).toBeInTheDocument();
		expect(initialInputElement).not.toBeVisible();

		// First toggle on
		await user.click(switchElement);
		const inputElement = screen.getByTestId(TEST_INPUT_TEST_ID);
		expect(inputElement).toBeInTheDocument();
		expect(inputElement).toBeVisible();

		// Then toggle off - input should be hidden but still in DOM
		await user.click(switchElement);
		const hiddenInputElement = screen.getByTestId(TEST_INPUT_TEST_ID);
		expect(hiddenInputElement).toBeInTheDocument();
		expect(hiddenInputElement).not.toBeVisible();
	});

	it('should maintain input state when toggling', async () => {
		const user = userEvent.setup();
		render(
			<AdvancedOptionItem
				title={defaultProps.title}
				description={defaultProps.description}
				input={defaultProps.input}
				defaultShowInput={false}
			/>,
		);

		const switchElement = screen.getByRole('switch');

		// Toggle on and interact with input
		await user.click(switchElement);
		const inputElement = screen.getByTestId(TEST_INPUT_TEST_ID);
		await user.type(inputElement, TEST_VALUE);
		expect(inputElement).toHaveValue(TEST_VALUE);

		// Toggle off - input should still be in DOM but hidden
		await user.click(switchElement);
		const hiddenInputElement = screen.getByTestId(TEST_INPUT_TEST_ID);
		expect(hiddenInputElement).toBeInTheDocument();
		expect(hiddenInputElement).not.toBeVisible();

		// Toggle back on - input should maintain its previous state
		await user.click(switchElement);
		const inputElementAgain = screen.getByTestId(TEST_INPUT_TEST_ID);
		expect(inputElementAgain).toHaveValue(TEST_VALUE); // State preserved!
	});

	it('should not render tooltip icon if tooltipText is not provided', () => {
		render(
			<AdvancedOptionItem
				title={defaultProps.title}
				description={defaultProps.description}
				input={defaultProps.input}
				defaultShowInput={false}
			/>,
		);

		const tooltipIcon = screen.queryByTestId('tooltip-icon');
		expect(tooltipIcon).not.toBeInTheDocument();
	});

	it('should render tooltip icon if tooltipText is provided', () => {
		render(
			<AdvancedOptionItem
				title={defaultProps.title}
				description={defaultProps.description}
				input={defaultProps.input}
				tooltipText="mock tooltip text"
				defaultShowInput={false}
			/>,
		);
		const tooltipIcon = screen.getByTestId('tooltip-icon');
		expect(tooltipIcon).toBeInTheDocument();
	});

	it('should show input when defaultShowInput is true', () => {
		render(
			<AdvancedOptionItem
				title={defaultProps.title}
				description={defaultProps.description}
				input={defaultProps.input}
				defaultShowInput
			/>,
		);
		const inputElement = screen.getByTestId(TEST_INPUT_TEST_ID);
		expect(inputElement).toBeInTheDocument();
		expect(inputElement).toBeVisible();
	});
});
