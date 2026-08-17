import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@signozhq/ui/tooltip';

import type { VariableSelection } from '../selectionTypes';
import ValueSelector from '../components/selectors/ValueSelector';

jest.mock('api/common/logEvent', () => ({
	__esModule: true,
	default: jest.fn(),
}));

const VALUES = ['checkout-service-prod', 'payments-service-prod'];
// A strict subset of the options — selecting every option renders as ALL instead.
const OPTIONS = [...VALUES, 'cart-service-prod'];

function renderSelector(
	selection: VariableSelection,
	options: string[],
	multiSelect = true,
): void {
	render(
		<TooltipProvider>
			<ValueSelector
				options={options}
				variableType="dynamic"
				multiSelect={multiSelect}
				showAllOption
				selection={selection}
				onChange={jest.fn()}
				emptyFallback={{ value: [], allSelected: false }}
				testId="variable-select-env"
			/>
		</TooltipProvider>,
	);
}

/** Hovers an element and lets the tooltip's open delay elapse. */
async function hover(element: HTMLElement): Promise<void> {
	const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
	await user.hover(element);
	act(() => {
		jest.advanceTimersByTime(500);
	});
}

describe('ValueSelector', () => {
	beforeEach(() => {
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it("reveals a tag's full value on hovering that tag", async () => {
		renderSelector({ value: VALUES, allSelected: false }, OPTIONS);

		// maxTagCount={1} + maxTagTextLength={10} → the one visible tag is cut short.
		await hover(screen.getByText('checkout-s...'));

		expect(screen.getByRole('tooltip')).toHaveTextContent(
			'checkout-service-prod',
		);
	});

	it('reveals the hidden values on hovering the +N overflow', async () => {
		renderSelector({ value: VALUES, allSelected: false }, OPTIONS);

		await hover(screen.getByText('+1'));

		expect(screen.getByRole('tooltip')).toHaveTextContent(
			'payments-service-prod',
		);
	});

	it('does not reveal anything from the rest of the control', async () => {
		renderSelector({ value: VALUES, allSelected: false }, OPTIONS);

		await hover(screen.getByTestId('variable-select-env'));

		expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
	});

	it('renders ALL for an all-selected variable', () => {
		renderSelector({ value: null, allSelected: true }, ['a', 'b']);

		expect(screen.getByText('ALL')).toBeInTheDocument();
	});

	describe('an ALL selection whose options are still loading', () => {
		it('reads ALL, not the "Select value" placeholder', () => {
			// Options arrive after the selection is known (first fetch, or a dynamic ALL,
			// which carries no values at all) — the control must not read as unselected.
			renderSelector({ value: null, allSelected: true }, [], true);

			expect(
				document.querySelector('.ant-select-selection-placeholder'),
			).toHaveTextContent('ALL');
		});

		it('still shows concrete values while options load', () => {
			renderSelector(
				{ value: ['checkout-service-prod'], allSelected: false },
				[],
				true,
			);

			expect(
				document.querySelector('.ant-select-selection-placeholder'),
			).toBeNull();
		});
	});

	describe('clearing', () => {
		function clearIcon(): Element | null {
			return document.querySelector('.ant-select-clear');
		}

		async function openDropdown(): Promise<void> {
			const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
			const control = screen.getByTestId('variable-select-env');
			await user.click(control.querySelector('input') as HTMLInputElement);
		}

		it('offers no clear icon while the list is closed', () => {
			renderSelector({ value: VALUES, allSelected: false }, OPTIONS);

			expect(clearIcon()).toBeNull();
		});

		it('offers it once the list is open', async () => {
			renderSelector({ value: VALUES, allSelected: false }, OPTIONS);

			await openDropdown();

			expect(clearIcon()).not.toBeNull();
		});

		it('offers no clear icon while every option is selected', async () => {
			// ALL is every option, so there is nothing to clear — and the shared control
			// refuses to empty an ALL selection, which would leave the icon inert.
			renderSelector({ value: OPTIONS, allSelected: true }, OPTIONS);

			await openDropdown();

			expect(clearIcon()).toBeNull();
		});

		it('empties the list and commits nothing until it closes', async () => {
			const onChange = jest.fn();
			const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
			render(
				<TooltipProvider>
					<ValueSelector
						options={OPTIONS}
						variableType="query"
						multiSelect
						showAllOption
						selection={{ value: VALUES, allSelected: false }}
						onChange={onChange}
						emptyFallback={{ value: [OPTIONS[0]], allSelected: false }}
						testId="variable-select-env"
					/>
				</TooltipProvider>,
			);

			await openDropdown();
			await user.click(clearIcon() as Element);

			expect(document.querySelectorAll('.ant-select-selection-item')).toHaveLength(
				0,
			);
			expect(onChange).not.toHaveBeenCalled();

			// Closing fills in whatever the variable should hold.
			await user.keyboard('{Escape}');

			expect(onChange).toHaveBeenCalledWith({
				value: [OPTIONS[0]],
				allSelected: false,
			});
		});
	});

	describe('opening and closing without touching the list', () => {
		function renderWith(
			selection: VariableSelection,
			options: string[],
		): jest.Mock {
			const onChange = jest.fn();
			render(
				<TooltipProvider>
					<ValueSelector
						options={options}
						variableType="dynamic"
						multiSelect
						showAllOption
						selection={selection}
						onChange={onChange}
						emptyFallback={{ value: [], allSelected: false }}
						testId="variable-select-env"
					/>
				</TooltipProvider>,
			);
			return onChange;
		}

		async function openThenClose(): Promise<void> {
			const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
			const control = screen.getByTestId('variable-select-env');
			await user.click(control.querySelector('input') as HTMLInputElement);
			await user.keyboard('{Escape}');
		}

		it('does not promote a pick that covers every available option to ALL', async () => {
			// A narrow time range can leave only the selected value in the list. That is
			// still an explicit pick, not "everything, always".
			const onChange = renderWith(
				{ value: ['checkout-service-prod'], allSelected: false },
				['checkout-service-prod'],
			);

			await openThenClose();

			expect(onChange).not.toHaveBeenCalled();
		});

		it('does not rewrite a dynamic ALL into concrete values', async () => {
			const onChange = renderWith({ value: null, allSelected: true }, OPTIONS);

			await openThenClose();

			expect(onChange).not.toHaveBeenCalled();
		});
	});
});
