import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { BadgeConfig } from '../itemRules';
import { CheckedState } from '../../../../types';
import { CheckboxFilterV2ValueRow } from '../CheckboxFilterV2ValueRow';

describe('CheckboxFilterV2ValueRow', () => {
	const defaultProps = {
		value: 'production',
		checkedState: 'unchecked' as CheckedState,
		disabled: false,
		title: 'Environment',
		onlyButtonLabel: 'Only',
		onCheckboxChange: jest.fn(),
		onOnlyOrAllClick: jest.fn(),
		badge: null as BadgeConfig | null,
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('checked states', () => {
		it('sets data-state="unchecked" for unchecked state', () => {
			render(
				<CheckboxFilterV2ValueRow {...defaultProps} checkedState="unchecked" />,
			);

			const row = screen.getByTestId('checkbox-value-row-production');
			expect(row).toHaveAttribute('data-state', 'unchecked');
		});

		it('sets data-state="checked" for checked state', () => {
			render(
				<CheckboxFilterV2ValueRow {...defaultProps} checkedState="checked" />,
			);

			const row = screen.getByTestId('checkbox-value-row-production');
			expect(row).toHaveAttribute('data-state', 'checked');
		});
	});

	describe('badge variations', () => {
		it('renders no badge when badge=null', () => {
			render(<CheckboxFilterV2ValueRow {...defaultProps} badge={null} />);

			expect(screen.queryByTestId(/^badge-/)).not.toBeInTheDocument();
		});

		it('renders "Not in" warning badge', () => {
			render(
				<CheckboxFilterV2ValueRow
					{...defaultProps}
					badge={{ key: 'not_in', label: 'Not in', color: 'warning' }}
				/>,
			);

			expect(screen.getByTestId('badge-not_in')).toBeInTheDocument();
			expect(screen.getByText('Not in')).toBeInTheDocument();
		});

		it('renders "Related" robin badge', () => {
			render(
				<CheckboxFilterV2ValueRow
					{...defaultProps}
					badge={{ key: 'related', label: 'Related', color: 'robin' }}
				/>,
			);

			expect(screen.getByTestId('badge-related')).toBeInTheDocument();
			expect(screen.getByText('Related')).toBeInTheDocument();
		});

		it('renders "Other" secondary badge', () => {
			render(
				<CheckboxFilterV2ValueRow
					{...defaultProps}
					badge={{ key: 'other', label: 'Other', color: 'secondary' }}
				/>,
			);

			expect(screen.getByTestId('badge-other')).toBeInTheDocument();
			expect(screen.getByText('Other')).toBeInTheDocument();
		});
	});

	describe('only/all button label', () => {
		it('shows "Only" label by default', () => {
			render(
				<CheckboxFilterV2ValueRow {...defaultProps} onlyButtonLabel="Only" />,
			);

			expect(screen.getByText('Only')).toBeInTheDocument();
		});

		it('shows "All" label when appropriate', () => {
			render(<CheckboxFilterV2ValueRow {...defaultProps} onlyButtonLabel="All" />);

			expect(screen.getByText('All')).toBeInTheDocument();
		});
	});

	describe('disabled state', () => {
		it('sets data-disabled=true when disabled', () => {
			render(<CheckboxFilterV2ValueRow {...defaultProps} disabled />);

			const row = screen.getByTestId('checkbox-value-row-production');
			expect(row).toHaveAttribute('data-disabled', 'true');
		});

		it('does not call onOnlyOrAllClick when disabled + clicked', async () => {
			const user = userEvent.setup();
			const onOnlyOrAllClick = jest.fn();
			render(
				<CheckboxFilterV2ValueRow
					{...defaultProps}
					disabled
					onOnlyOrAllClick={onOnlyOrAllClick}
				/>,
			);

			await user.click(screen.getByText('production'));

			expect(onOnlyOrAllClick).not.toHaveBeenCalled();
		});

		it('does not call onOnlyOrAllClick on keydown when disabled', async () => {
			const user = userEvent.setup();
			const onOnlyOrAllClick = jest.fn();
			render(
				<CheckboxFilterV2ValueRow
					{...defaultProps}
					disabled
					onOnlyOrAllClick={onOnlyOrAllClick}
				/>,
			);

			screen.getByText('production').focus();
			await user.keyboard('{Enter}');

			expect(onOnlyOrAllClick).not.toHaveBeenCalled();
		});
	});

	describe('special value indicators', () => {
		it('renders row for "true" value', () => {
			render(<CheckboxFilterV2ValueRow {...defaultProps} value="true" />);

			expect(screen.getByTestId('checkbox-value-row-true')).toBeInTheDocument();
			expect(screen.getByText('true')).toBeInTheDocument();
		});

		it('renders row for "false" value', () => {
			render(<CheckboxFilterV2ValueRow {...defaultProps} value="false" />);

			expect(screen.getByTestId('checkbox-value-row-false')).toBeInTheDocument();
			expect(screen.getByText('false')).toBeInTheDocument();
		});

		it('renders row for regular values', () => {
			render(<CheckboxFilterV2ValueRow {...defaultProps} value="production" />);

			expect(
				screen.getByTestId('checkbox-value-row-production'),
			).toBeInTheDocument();
			expect(screen.getByText('production')).toBeInTheDocument();
		});
	});

	describe('interactions', () => {
		it('renders checkbox with correct testId', () => {
			render(
				<CheckboxFilterV2ValueRow {...defaultProps} checkedState="unchecked" />,
			);

			expect(
				screen.getByTestId('checkbox-Environment-production'),
			).toBeInTheDocument();
		});

		it('calls onOnlyOrAllClick on value text click', async () => {
			const user = userEvent.setup();
			const onOnlyOrAllClick = jest.fn();
			render(
				<CheckboxFilterV2ValueRow
					{...defaultProps}
					onOnlyOrAllClick={onOnlyOrAllClick}
				/>,
			);

			await user.click(screen.getByText('production'));

			expect(onOnlyOrAllClick).toHaveBeenCalledTimes(1);
		});

		it('calls onOnlyOrAllClick on Enter key', async () => {
			const user = userEvent.setup();
			const onOnlyOrAllClick = jest.fn();
			render(
				<CheckboxFilterV2ValueRow
					{...defaultProps}
					onOnlyOrAllClick={onOnlyOrAllClick}
				/>,
			);

			const valueButton = screen
				.getByText('production')
				.closest('[role="button"]');
			await user.tab();
			await user.tab();
			if (valueButton && document.activeElement === valueButton) {
				await user.keyboard('{Enter}');
			}

			expect(onOnlyOrAllClick).toHaveBeenCalled();
		});

		it('calls onOnlyOrAllClick on Space key', async () => {
			const user = userEvent.setup();
			const onOnlyOrAllClick = jest.fn();
			render(
				<CheckboxFilterV2ValueRow
					{...defaultProps}
					onOnlyOrAllClick={onOnlyOrAllClick}
				/>,
			);

			const valueButton = screen
				.getByText('production')
				.closest('[role="button"]');
			await user.tab();
			await user.tab();
			if (valueButton && document.activeElement === valueButton) {
				await user.keyboard(' ');
			}

			expect(onOnlyOrAllClick).toHaveBeenCalled();
		});

		it('shows Toggle button', () => {
			render(<CheckboxFilterV2ValueRow {...defaultProps} />);

			expect(screen.getByText('Toggle')).toBeInTheDocument();
		});
	});

	describe('custom renderer', () => {
		it('uses customRendererForValue when provided', () => {
			const customRenderer = (value: string): JSX.Element => (
				<span data-testid="custom-render">{`Custom: ${value}`}</span>
			);

			render(
				<CheckboxFilterV2ValueRow
					{...defaultProps}
					customRendererForValue={customRenderer}
				/>,
			);

			expect(screen.getByTestId('custom-render')).toBeInTheDocument();
			expect(screen.getByText('Custom: production')).toBeInTheDocument();
		});

		it('shows default value text when no custom renderer', () => {
			render(<CheckboxFilterV2ValueRow {...defaultProps} />);

			expect(screen.getByText('production')).toBeInTheDocument();
		});
	});

	describe('state combinations', () => {
		it('checked + not_in badge', () => {
			render(
				<CheckboxFilterV2ValueRow
					{...defaultProps}
					checkedState="unchecked"
					badge={{ key: 'not_in', label: 'Not in', color: 'warning' }}
				/>,
			);

			expect(screen.getByTestId('badge-not_in')).toBeInTheDocument();
		});

		it('disabled + badge still shows badge', () => {
			render(
				<CheckboxFilterV2ValueRow
					{...defaultProps}
					disabled
					badge={{ key: 'other', label: 'Other', color: 'secondary' }}
				/>,
			);

			expect(screen.getByTestId('badge-other')).toBeInTheDocument();
		});
	});
});
