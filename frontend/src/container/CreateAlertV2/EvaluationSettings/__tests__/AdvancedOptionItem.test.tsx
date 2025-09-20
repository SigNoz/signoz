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

		expect(screen.queryByTestId(TEST_INPUT_TEST_ID)).not.toBeInTheDocument();

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

		expect(screen.queryByTestId(TEST_INPUT_TEST_ID)).not.toBeInTheDocument();

		// First toggle on
		await user.click(switchElement);
		expect(screen.getByTestId(TEST_INPUT_TEST_ID)).toBeInTheDocument();

		// Then toggle off
		await user.click(switchElement);
		expect(screen.queryByTestId(TEST_INPUT_TEST_ID)).not.toBeInTheDocument();
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

	it('should not render tooltip icon if tooltipText is not provided', () => {
		render(
			<AdvancedOptionItem
				title={defaultProps.title}
				description={defaultProps.description}
				input={defaultProps.input}
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
			/>,
		);
		const tooltipIcon = screen.getByTestId('tooltip-icon');
		expect(tooltipIcon).toBeInTheDocument();
	});
});
