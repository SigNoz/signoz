/* eslint-disable react/jsx-props-no-spreading */
import { fireEvent, render, screen } from '@testing-library/react';

import LabelsInput from '../LabelsInput';
import { LabelsInputProps } from '../types';

// Mock the CloseOutlined icon
jest.mock('@ant-design/icons', () => ({
	CloseOutlined: (): JSX.Element => <span data-testid="close-icon">×</span>,
}));

const mockOnLabelsChange = jest.fn();
const mockValidateLabelsKey = jest.fn().mockReturnValue(null);

const defaultProps: LabelsInputProps = {
	labels: {},
	onLabelsChange: mockOnLabelsChange,
	validateLabelsKey: mockValidateLabelsKey,
};

const ADD_LABELS_TEXT = '+ Add labels';
const ENTER_KEY_PLACEHOLDER = 'Enter key';
const ENTER_VALUE_PLACEHOLDER = 'Enter value';

const CLOSE_ICON_TEST_ID = 'close-icon';
const SEVERITY_HIGH_TEXT = 'severity: high';
const ENVIRONMENT_PRODUCTION_TEXT = 'environment: production';
const SEVERITY_HIGH_KEY_VALUE = 'severity:high';

const renderLabelsInput = (
	props: Partial<LabelsInputProps> = {},
): ReturnType<typeof render> =>
	render(<LabelsInput {...defaultProps} {...props} />);

describe('LabelsInput', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockValidateLabelsKey.mockReturnValue(null); // Reset validation to always pass
	});

	describe('Initial Rendering', () => {
		it('renders add button when no labels exist', () => {
			renderLabelsInput();
			expect(screen.getByText(ADD_LABELS_TEXT)).toBeInTheDocument();
			expect(screen.queryByTestId(CLOSE_ICON_TEST_ID)).not.toBeInTheDocument();
		});

		it('renders existing labels when provided', () => {
			const labels = { severity: 'high', environment: 'production' };
			renderLabelsInput({ labels });

			expect(screen.getByText(SEVERITY_HIGH_TEXT)).toBeInTheDocument();
			expect(screen.getByText(ENVIRONMENT_PRODUCTION_TEXT)).toBeInTheDocument();
			expect(screen.getAllByTestId(CLOSE_ICON_TEST_ID)).toHaveLength(2);
		});

		it('does not render existing labels section when no labels', () => {
			renderLabelsInput();
			expect(screen.queryByText(SEVERITY_HIGH_TEXT)).not.toBeInTheDocument();
		});
	});

	describe('Adding Labels', () => {
		it('shows input field when add button is clicked', () => {
			renderLabelsInput();

			fireEvent.click(screen.getByText(ADD_LABELS_TEXT));

			expect(
				screen.getByPlaceholderText(ENTER_KEY_PLACEHOLDER),
			).toBeInTheDocument();
			expect(screen.queryByText(ADD_LABELS_TEXT)).not.toBeInTheDocument();
		});

		it('switches from key input to value input on Enter', () => {
			renderLabelsInput();

			fireEvent.click(screen.getByText(ADD_LABELS_TEXT));
			const input = screen.getByPlaceholderText(ENTER_KEY_PLACEHOLDER);

			fireEvent.change(input, { target: { value: 'severity' } });
			fireEvent.keyDown(input, { key: 'Enter' });

			expect(
				screen.getByPlaceholderText(ENTER_VALUE_PLACEHOLDER),
			).toBeInTheDocument();
			expect(
				screen.queryByPlaceholderText(ENTER_KEY_PLACEHOLDER),
			).not.toBeInTheDocument();
		});

		it('adds label when both key and value are provided', () => {
			renderLabelsInput();

			fireEvent.click(screen.getByText(ADD_LABELS_TEXT));
			const input = screen.getByPlaceholderText(ENTER_KEY_PLACEHOLDER);

			// Enter key
			fireEvent.change(input, { target: { value: 'severity' } });
			fireEvent.keyDown(input, { key: 'Enter' });

			// Enter value
			const valueInput = screen.getByPlaceholderText(ENTER_VALUE_PLACEHOLDER);
			fireEvent.change(valueInput, { target: { value: 'high' } });
			fireEvent.keyDown(valueInput, { key: 'Enter' });

			expect(mockOnLabelsChange).toHaveBeenCalledWith({ severity: 'high' });
		});

		it('does not switch to value input if key is empty', () => {
			renderLabelsInput();

			fireEvent.click(screen.getByText(ADD_LABELS_TEXT));
			const input = screen.getByPlaceholderText(ENTER_KEY_PLACEHOLDER);

			fireEvent.keyDown(input, { key: 'Enter' });

			expect(
				screen.getByPlaceholderText(ENTER_KEY_PLACEHOLDER),
			).toBeInTheDocument();
			expect(
				screen.queryByPlaceholderText(ENTER_VALUE_PLACEHOLDER),
			).not.toBeInTheDocument();
		});

		it('does not add label if value is empty', () => {
			renderLabelsInput();

			fireEvent.click(screen.getByText(ADD_LABELS_TEXT));
			const input = screen.getByPlaceholderText(ENTER_KEY_PLACEHOLDER);

			// Enter key
			fireEvent.change(input, { target: { value: 'severity' } });
			fireEvent.keyDown(input, { key: 'Enter' });

			// Try to add with empty value
			const valueInput = screen.getByPlaceholderText(ENTER_VALUE_PLACEHOLDER);
			fireEvent.keyDown(valueInput, { key: 'Enter' });

			expect(mockOnLabelsChange).not.toHaveBeenCalled();
		});

		it('trims whitespace from key and value', () => {
			renderLabelsInput();

			fireEvent.click(screen.getByText(ADD_LABELS_TEXT));
			const input = screen.getByPlaceholderText(ENTER_KEY_PLACEHOLDER);

			// Enter key with whitespace
			fireEvent.change(input, { target: { value: '  severity  ' } });
			fireEvent.keyDown(input, { key: 'Enter' });

			// Enter value with whitespace
			const valueInput = screen.getByPlaceholderText(ENTER_VALUE_PLACEHOLDER);
			fireEvent.change(valueInput, { target: { value: '  high  ' } });
			fireEvent.keyDown(valueInput, { key: 'Enter' });

			expect(mockOnLabelsChange).toHaveBeenCalledWith({ severity: 'high' });
		});

		it('resets input state after adding label', () => {
			renderLabelsInput();

			fireEvent.click(screen.getByText(ADD_LABELS_TEXT));
			const input = screen.getByPlaceholderText(ENTER_KEY_PLACEHOLDER);

			// Add a label
			fireEvent.change(input, { target: { value: 'severity' } });
			fireEvent.keyDown(input, { key: 'Enter' });

			const valueInput = screen.getByPlaceholderText(ENTER_VALUE_PLACEHOLDER);
			fireEvent.change(valueInput, { target: { value: 'high' } });
			fireEvent.keyDown(valueInput, { key: 'Enter' });

			// Should be back to key input
			expect(
				screen.getByPlaceholderText(ENTER_KEY_PLACEHOLDER),
			).toBeInTheDocument();
			expect(
				screen.queryByPlaceholderText(ENTER_VALUE_PLACEHOLDER),
			).not.toBeInTheDocument();
		});
	});

	describe('Removing Labels', () => {
		it('removes label when close button is clicked', () => {
			const labels = { severity: 'high', environment: 'production' };
			renderLabelsInput({ labels });

			const removeButtons = screen.getAllByTestId(CLOSE_ICON_TEST_ID);
			fireEvent.click(removeButtons[0]);

			expect(mockOnLabelsChange).toHaveBeenCalledWith({
				environment: 'production',
			});
		});

		it('calls onLabelsChange with empty object when last label is removed', () => {
			const labels = { severity: 'high' };
			renderLabelsInput({ labels });

			const removeButton = screen.getByTestId('close-icon');
			fireEvent.click(removeButton);

			expect(mockOnLabelsChange).toHaveBeenCalledWith({});
		});
	});

	describe('Keyboard Interactions', () => {
		it('cancels adding label on Escape key', () => {
			renderLabelsInput();

			fireEvent.click(screen.getByText(ADD_LABELS_TEXT));
			const input = screen.getByPlaceholderText(ENTER_KEY_PLACEHOLDER);

			fireEvent.keyDown(input, { key: 'Escape' });

			expect(screen.getByText(ADD_LABELS_TEXT)).toBeInTheDocument();
			expect(
				screen.queryByPlaceholderText(ENTER_KEY_PLACEHOLDER),
			).not.toBeInTheDocument();
		});

		it('cancels adding label on Escape key in value input', () => {
			renderLabelsInput();

			fireEvent.click(screen.getByText(ADD_LABELS_TEXT));
			const input = screen.getByPlaceholderText(ENTER_KEY_PLACEHOLDER);

			// Enter key
			fireEvent.change(input, { target: { value: 'severity' } });
			fireEvent.keyDown(input, { key: 'Enter' });

			// Cancel in value input
			const valueInput = screen.getByPlaceholderText(ENTER_VALUE_PLACEHOLDER);
			fireEvent.keyDown(valueInput, { key: 'Escape' });

			expect(screen.getByText(ADD_LABELS_TEXT)).toBeInTheDocument();
			expect(
				screen.queryByPlaceholderText(ENTER_VALUE_PLACEHOLDER),
			).not.toBeInTheDocument();
		});
	});

	describe('Blur Behavior', () => {
		it('closes input immediately when both key and value are empty', () => {
			renderLabelsInput();

			fireEvent.click(screen.getByText(ADD_LABELS_TEXT));
			const input = screen.getByPlaceholderText(ENTER_KEY_PLACEHOLDER);

			fireEvent.blur(input);

			// The input should close immediately when both key and value are empty
			expect(screen.getByText(ADD_LABELS_TEXT)).toBeInTheDocument();
			expect(
				screen.queryByPlaceholderText(ENTER_KEY_PLACEHOLDER),
			).not.toBeInTheDocument();
		});

		it('does not close input immediately when key has value', () => {
			jest.useFakeTimers();
			renderLabelsInput();

			fireEvent.click(screen.getByText(ADD_LABELS_TEXT));
			const input = screen.getByPlaceholderText(ENTER_KEY_PLACEHOLDER);

			fireEvent.change(input, { target: { value: 'severity' } });
			fireEvent.blur(input);

			jest.advanceTimersByTime(200);

			expect(
				screen.getByPlaceholderText(ENTER_KEY_PLACEHOLDER),
			).toBeInTheDocument();
			expect(screen.queryByText(ADD_LABELS_TEXT)).not.toBeInTheDocument();

			jest.useRealTimers();
		});
	});

	describe('Input Change Handling', () => {
		it('updates key input value correctly', () => {
			renderLabelsInput();

			fireEvent.click(screen.getByText(ADD_LABELS_TEXT));
			const input = screen.getByPlaceholderText(ENTER_KEY_PLACEHOLDER);

			fireEvent.change(input, { target: { value: 'severity' } });

			expect(input).toHaveValue('severity');
		});

		it('updates value input correctly', () => {
			renderLabelsInput();

			fireEvent.click(screen.getByText(ADD_LABELS_TEXT));
			const input = screen.getByPlaceholderText(ENTER_KEY_PLACEHOLDER);

			// Enter key
			fireEvent.change(input, { target: { value: 'severity' } });
			fireEvent.keyDown(input, { key: 'Enter' });

			// Update value
			const valueInput = screen.getByPlaceholderText(ENTER_VALUE_PLACEHOLDER);
			fireEvent.change(valueInput, { target: { value: 'high' } });

			expect(valueInput).toHaveValue('high');
		});
	});

	describe('Edge Cases', () => {
		it('handles multiple labels correctly', () => {
			const labels = {
				severity: 'high',
				environment: 'production',
				service: 'api-gateway',
			};
			renderLabelsInput({ labels });

			expect(screen.getByText(SEVERITY_HIGH_TEXT)).toBeInTheDocument();
			expect(screen.getByText(ENVIRONMENT_PRODUCTION_TEXT)).toBeInTheDocument();
			expect(screen.getByText('service: api-gateway')).toBeInTheDocument();
			expect(screen.getAllByTestId(CLOSE_ICON_TEST_ID)).toHaveLength(3);
		});

		it('handles empty string values', () => {
			const labels = { severity: '' };
			renderLabelsInput({ labels });

			expect(screen.getByText(/severity/)).toBeInTheDocument();
		});

		it('handles special characters in labels', () => {
			const labels = { 'service-name': 'api-gateway-v1' };
			renderLabelsInput({ labels });

			expect(screen.getByText('service-name: api-gateway-v1')).toBeInTheDocument();
		});

		it('maintains focus on input after adding label', () => {
			renderLabelsInput();

			fireEvent.click(screen.getByText(ADD_LABELS_TEXT));
			const input = screen.getByPlaceholderText(ENTER_KEY_PLACEHOLDER);

			// Add a label
			fireEvent.change(input, { target: { value: 'severity' } });
			fireEvent.keyDown(input, { key: 'Enter' });

			const valueInput = screen.getByPlaceholderText(ENTER_VALUE_PLACEHOLDER);
			fireEvent.change(valueInput, { target: { value: 'high' } });
			fireEvent.keyDown(valueInput, { key: 'Enter' });

			// Should be focused on new key input
			const newInput = screen.getByPlaceholderText(ENTER_KEY_PLACEHOLDER);
			expect(newInput).toHaveFocus();
		});
	});

	describe('Key:Value Format Support', () => {
		it('adds label when key:value format is entered and Enter is pressed', () => {
			renderLabelsInput();

			fireEvent.click(screen.getByText(ADD_LABELS_TEXT));
			const input = screen.getByPlaceholderText(ENTER_KEY_PLACEHOLDER);

			// Enter key:value format
			fireEvent.change(input, { target: { value: SEVERITY_HIGH_KEY_VALUE } });
			fireEvent.keyDown(input, { key: 'Enter' });

			expect(mockOnLabelsChange).toHaveBeenCalledWith({ severity: 'high' });
		});

		it('trims whitespace from key and value in key:value format', () => {
			renderLabelsInput();

			fireEvent.click(screen.getByText(ADD_LABELS_TEXT));
			const input = screen.getByPlaceholderText(ENTER_KEY_PLACEHOLDER);

			// Enter key:value format with whitespace
			fireEvent.change(input, { target: { value: '  severity  :  high  ' } });
			fireEvent.keyDown(input, { key: 'Enter' });

			expect(mockOnLabelsChange).toHaveBeenCalledWith({ severity: 'high' });
		});

		it('handles values with colons correctly', () => {
			renderLabelsInput();

			fireEvent.click(screen.getByText(ADD_LABELS_TEXT));
			const input = screen.getByPlaceholderText(ENTER_KEY_PLACEHOLDER);

			// Enter key:value format where value contains colons
			fireEvent.change(input, {
				target: { value: 'url:https://example.com:8080' },
			});
			fireEvent.keyDown(input, { key: 'Enter' });

			expect(mockOnLabelsChange).toHaveBeenCalledWith({
				url: 'https://example.com:8080',
			});
		});

		it('does not add label if key is empty in key:value format', () => {
			renderLabelsInput();

			fireEvent.click(screen.getByText(ADD_LABELS_TEXT));
			const input = screen.getByPlaceholderText(ENTER_KEY_PLACEHOLDER);

			// Enter key:value format with empty key
			fireEvent.change(input, { target: { value: ':high' } });
			fireEvent.keyDown(input, { key: 'Enter' });

			expect(mockOnLabelsChange).not.toHaveBeenCalled();
		});

		it('does not add label if value is empty in key:value format', () => {
			renderLabelsInput();

			fireEvent.click(screen.getByText(ADD_LABELS_TEXT));
			const input = screen.getByPlaceholderText(ENTER_KEY_PLACEHOLDER);

			// Enter key:value format with empty value
			fireEvent.change(input, { target: { value: 'severity:' } });
			fireEvent.keyDown(input, { key: 'Enter' });

			expect(mockOnLabelsChange).not.toHaveBeenCalled();
		});

		it('does not add label if only colon is entered', () => {
			renderLabelsInput();

			fireEvent.click(screen.getByText(ADD_LABELS_TEXT));
			const input = screen.getByPlaceholderText(ENTER_KEY_PLACEHOLDER);

			// Enter only colon
			fireEvent.change(input, { target: { value: ':' } });
			fireEvent.keyDown(input, { key: 'Enter' });

			expect(mockOnLabelsChange).not.toHaveBeenCalled();
		});

		it('resets input state after adding label with key:value format', () => {
			renderLabelsInput();

			fireEvent.click(screen.getByText(ADD_LABELS_TEXT));
			const input = screen.getByPlaceholderText(ENTER_KEY_PLACEHOLDER);

			// Add label with key:value format
			fireEvent.change(input, { target: { value: 'severity:high' } });
			fireEvent.keyDown(input, { key: 'Enter' });

			// Should be back to key input for next label
			expect(
				screen.getByPlaceholderText(ENTER_KEY_PLACEHOLDER),
			).toBeInTheDocument();
			expect(
				screen.queryByPlaceholderText(ENTER_VALUE_PLACEHOLDER),
			).not.toBeInTheDocument();
		});

		it('does not auto-save when typing key:value without pressing Enter', () => {
			renderLabelsInput();

			fireEvent.click(screen.getByText(ADD_LABELS_TEXT));
			const input = screen.getByPlaceholderText(ENTER_KEY_PLACEHOLDER);

			// Type key:value format but don't press Enter
			fireEvent.change(input, { target: { value: SEVERITY_HIGH_KEY_VALUE } });

			// Should not have called onLabelsChange yet
			expect(mockOnLabelsChange).not.toHaveBeenCalled();
		});

		it('handles multiple key:value entries correctly', () => {
			const { rerender } = renderLabelsInput();

			fireEvent.click(screen.getByText(ADD_LABELS_TEXT));
			const input = screen.getByPlaceholderText(ENTER_KEY_PLACEHOLDER);

			// Add first label
			fireEvent.change(input, { target: { value: SEVERITY_HIGH_KEY_VALUE } });
			fireEvent.keyDown(input, { key: 'Enter' });

			// Simulate parent component updating labels
			const firstLabels = { severity: 'high' };
			rerender(
				<LabelsInput
					labels={firstLabels}
					onLabelsChange={mockOnLabelsChange}
					validateLabelsKey={mockValidateLabelsKey}
				/>,
			);

			// Add second label
			const newInput = screen.getByPlaceholderText(ENTER_KEY_PLACEHOLDER);
			fireEvent.change(newInput, { target: { value: 'environment:production' } });
			fireEvent.keyDown(newInput, { key: 'Enter' });

			// Check that we made two calls and the last one includes both labels
			expect(mockOnLabelsChange).toHaveBeenCalledTimes(2);
			expect(mockOnLabelsChange).toHaveBeenNthCalledWith(1, { severity: 'high' });
			expect(mockOnLabelsChange).toHaveBeenNthCalledWith(2, {
				severity: 'high',
				environment: 'production',
			});
		});
	});
});
