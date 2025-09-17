import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import AdvancedOptionItem from '../AdvancedOptionItem/AdvancedOptionItem';

const TEST_INPUT_PLACEHOLDER = 'Test input';
const TEST_TITLE = 'Test Title';
const TEST_DESCRIPTION = 'Test Description';
const TEST_VALUE = 'test value';
const FIRST_INPUT_PLACEHOLDER = 'First input';
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

	it('should render title and description', () => {
		render(
			<AdvancedOptionItem
				title={defaultProps.title}
				description={defaultProps.description}
				input={defaultProps.input}
			/>,
		);

		expect(screen.getByText(TEST_TITLE)).toBeInTheDocument();
		expect(screen.getByText(TEST_DESCRIPTION)).toBeInTheDocument();
	});

	it('should render switch component', () => {
		render(
			<AdvancedOptionItem
				title={defaultProps.title}
				description={defaultProps.description}
				input={defaultProps.input}
			/>,
		);

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
			/>,
		);

		expect(screen.queryByTestId(TEST_INPUT_TEST_ID)).not.toBeInTheDocument();
	});

	it('should show input when switch is toggled on', async () => {
		const user = userEvent.setup();
		render(
			<AdvancedOptionItem
				title={defaultProps.title}
				description={defaultProps.description}
				input={defaultProps.input}
			/>,
		);

		const switchElement = screen.getByRole('switch');
		await user.click(switchElement);

		expect(switchElement).toBeChecked();
		expect(screen.getByTestId(TEST_INPUT_TEST_ID)).toBeInTheDocument();
	});

	it('should hide input when switch is toggled off', async () => {
		const user = userEvent.setup();
		render(
			<AdvancedOptionItem
				title={defaultProps.title}
				description={defaultProps.description}
				input={defaultProps.input}
			/>,
		);

		const switchElement = screen.getByRole('switch');

		// First toggle on
		await user.click(switchElement);
		expect(screen.getByTestId(TEST_INPUT_TEST_ID)).toBeInTheDocument();

		// Then toggle off
		await user.click(switchElement);
		expect(screen.queryByTestId(TEST_INPUT_TEST_ID)).not.toBeInTheDocument();
	});

	it('should toggle switch state correctly', async () => {
		const user = userEvent.setup();
		render(
			<AdvancedOptionItem
				title={defaultProps.title}
				description={defaultProps.description}
				input={defaultProps.input}
			/>,
		);

		const switchElement = screen.getByRole('switch');

		// Initial state
		expect(switchElement).not.toBeChecked();

		// After first click
		await user.click(switchElement);
		expect(switchElement).toBeChecked();

		// After second click
		await user.click(switchElement);
		expect(switchElement).not.toBeChecked();
	});

	it('should render input with correct props when visible', async () => {
		const user = userEvent.setup();
		render(
			<AdvancedOptionItem
				title={defaultProps.title}
				description={defaultProps.description}
				input={defaultProps.input}
			/>,
		);

		const switchElement = screen.getByRole('switch');
		await user.click(switchElement);

		const inputElement = screen.getByTestId(TEST_INPUT_TEST_ID);
		expect(inputElement).toBeInTheDocument();
		expect(inputElement).toHaveAttribute('placeholder', TEST_INPUT_PLACEHOLDER);
	});

	it('should handle multiple toggle operations', async () => {
		const user = userEvent.setup();
		render(
			<AdvancedOptionItem
				title={defaultProps.title}
				description={defaultProps.description}
				input={defaultProps.input}
			/>,
		);

		const switchElement = screen.getByRole('switch');

		// Toggle on
		await user.click(switchElement);
		expect(screen.getByTestId(TEST_INPUT_TEST_ID)).toBeInTheDocument();

		// Toggle off
		await user.click(switchElement);
		expect(screen.queryByTestId(TEST_INPUT_TEST_ID)).not.toBeInTheDocument();

		// Toggle on again
		await user.click(switchElement);
		expect(screen.getByTestId(TEST_INPUT_TEST_ID)).toBeInTheDocument();
	});

	it('should maintain input state when toggling', async () => {
		const user = userEvent.setup();
		render(
			<AdvancedOptionItem
				title={defaultProps.title}
				description={defaultProps.description}
				input={defaultProps.input}
			/>,
		);

		const switchElement = screen.getByRole('switch');

		// Toggle on and interact with input
		await user.click(switchElement);
		const inputElement = screen.getByTestId(TEST_INPUT_TEST_ID);
		await user.type(inputElement, TEST_VALUE);
		expect(inputElement).toHaveValue(TEST_VALUE);

		// Toggle off
		await user.click(switchElement);
		expect(screen.queryByTestId(TEST_INPUT_TEST_ID)).not.toBeInTheDocument();

		// Toggle back on - input should be recreated (fresh state)
		await user.click(switchElement);
		const inputElementAgain = screen.getByTestId(TEST_INPUT_TEST_ID);
		expect(inputElementAgain).toHaveValue(''); // Fresh input, no previous state
	});

	it('should render with different title and description', () => {
		const customTitle = 'Custom Title';
		const customDescription = 'Custom Description';

		render(
			<AdvancedOptionItem
				title={customTitle}
				description={customDescription}
				input={defaultProps.input}
			/>,
		);

		expect(screen.getByText(customTitle)).toBeInTheDocument();
		expect(screen.getByText(customDescription)).toBeInTheDocument();
	});

	it('should render with complex input component', async () => {
		const user = userEvent.setup();
		const complexInput = (
			<div data-testid="complex-input">
				<input placeholder={FIRST_INPUT_PLACEHOLDER} />
				<select>
					<option value="option1">Option 1</option>
					<option value="option2">Option 2</option>
				</select>
			</div>
		);

		render(
			<AdvancedOptionItem
				title={defaultProps.title}
				description={defaultProps.description}
				input={complexInput}
			/>,
		);

		const switchElement = screen.getByRole('switch');
		await user.click(switchElement);

		expect(screen.getByTestId('complex-input')).toBeInTheDocument();
		expect(
			screen.getByPlaceholderText(FIRST_INPUT_PLACEHOLDER),
		).toBeInTheDocument();
		expect(screen.getByRole('combobox')).toBeInTheDocument();
	});
});
