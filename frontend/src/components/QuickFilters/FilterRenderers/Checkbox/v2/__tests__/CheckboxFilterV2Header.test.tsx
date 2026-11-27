import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CheckboxFilterV2Header } from '../CheckboxFilterV2Header';

describe('CheckboxFilterV2Header', () => {
	const defaultProps = {
		title: 'Environment',
		isOpen: false,
		canReset: true,
		onToggleOpen: jest.fn(),
		onClear: jest.fn(),
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('collapsed state', () => {
		it('renders title', () => {
			render(<CheckboxFilterV2Header {...defaultProps} isOpen={false} />);

			expect(screen.getByText('Environment')).toBeInTheDocument();
		});

		it('sets data-state="closed" when collapsed', () => {
			render(<CheckboxFilterV2Header {...defaultProps} isOpen={false} />);

			const header = screen.getByTestId('checkbox-filter-header');
			expect(header).toHaveAttribute('data-state', 'closed');
		});

		it('does not render reset when collapsed', () => {
			render(<CheckboxFilterV2Header {...defaultProps} isOpen={false} />);

			expect(
				screen.queryByTestId('checkbox-filter-clear-all'),
			).not.toBeInTheDocument();
		});
	});

	describe('expanded state', () => {
		it('sets data-state="open" when expanded', () => {
			render(<CheckboxFilterV2Header {...defaultProps} isOpen />);

			const header = screen.getByTestId('checkbox-filter-header');
			expect(header).toHaveAttribute('data-state', 'open');
		});

		it('renders reset when the section has a filter applied', () => {
			render(<CheckboxFilterV2Header {...defaultProps} isOpen />);

			expect(screen.getByTestId('checkbox-filter-clear-all')).toBeInTheDocument();
		});

		it('hides reset when there is nothing to reset', () => {
			render(<CheckboxFilterV2Header {...defaultProps} isOpen canReset={false} />);

			expect(
				screen.queryByTestId('checkbox-filter-clear-all'),
			).not.toBeInTheDocument();
		});
	});

	describe('interactions', () => {
		it('calls onToggleOpen on header click', async () => {
			const user = userEvent.setup();
			const onToggleOpen = jest.fn();
			render(
				<CheckboxFilterV2Header {...defaultProps} onToggleOpen={onToggleOpen} />,
			);

			await user.click(screen.getByTestId('checkbox-filter-header'));

			expect(onToggleOpen).toHaveBeenCalledTimes(1);
		});

		it('calls onToggleOpen on Enter key', async () => {
			const user = userEvent.setup();
			const onToggleOpen = jest.fn();
			render(
				<CheckboxFilterV2Header {...defaultProps} onToggleOpen={onToggleOpen} />,
			);

			screen.getByTestId('checkbox-filter-header').focus();
			await user.keyboard('{Enter}');

			expect(onToggleOpen).toHaveBeenCalledTimes(1);
		});

		it('calls onToggleOpen on Space key', async () => {
			const user = userEvent.setup();
			const onToggleOpen = jest.fn();
			render(
				<CheckboxFilterV2Header {...defaultProps} onToggleOpen={onToggleOpen} />,
			);

			screen.getByTestId('checkbox-filter-header').focus();
			await user.keyboard(' ');

			expect(onToggleOpen).toHaveBeenCalledTimes(1);
		});

		it('calls onClear on reset click without toggling open', async () => {
			const user = userEvent.setup();
			const onClear = jest.fn();
			const onToggleOpen = jest.fn();
			render(
				<CheckboxFilterV2Header
					{...defaultProps}
					isOpen
					onClear={onClear}
					onToggleOpen={onToggleOpen}
				/>,
			);

			await user.click(screen.getByTestId('checkbox-filter-clear-all'));

			expect(onClear).toHaveBeenCalledTimes(1);
			expect(onToggleOpen).not.toHaveBeenCalled();
		});
	});
});
