import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@signozhq/ui/tooltip';

import CustomMultiSelect from '../CustomMultiSelect';

const OPTIONS = [
	{ label: 'checkout-service-prod', value: 'checkout-service-prod' },
	{ label: 'payments-service-prod', value: 'payments-service-prod' },
	{ label: 'cart-service-prod', value: 'cart-service-prod' },
];

const SELECTED = ['checkout-service-prod', 'payments-service-prod'];

function renderSelect(): void {
	render(
		<TooltipProvider>
			<CustomMultiSelect
				options={OPTIONS}
				value={SELECTED}
				maxTagCount={1}
				maxTagTextLength={10}
				maxTagPlaceholder={(omitted): string => `+${omitted.length}`}
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

describe('CustomMultiSelect tag tooltip', () => {
	beforeEach(() => {
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it("reveals a tag's untruncated value on hover", async () => {
		renderSelect();

		await hover(screen.getByText('checkout-s...'));

		expect(screen.getByRole('tooltip')).toHaveTextContent(
			'checkout-service-prod',
		);
	});

	// The `+N` placeholder stays the caller's to render — several callers already wrap
	// it in a tooltip of their own, and a second one would stack on top.
	it('leaves the +N overflow placeholder untouched', async () => {
		renderSelect();

		await hover(screen.getByText('+1'));

		expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
	});
});
