import { LlmpricingruletypesLLMPricingRuleCacheModeDTO as CacheModeDTO } from 'api/generated/services/sigNoz.schemas';
import { fireEvent, render, screen, userEvent } from 'tests/test-utils';

import type { DrawerDraft } from '../../../../../../types';
import ExtraPricingBuckets from '../ExtraPricingBuckets';

type Pricing = DrawerDraft['pricing'];

function makePricing(overrides: Partial<Pricing> = {}): Pricing {
	return {
		input: 3,
		output: 9,
		cacheMode: CacheModeDTO.unknown,
		cacheRead: null,
		cacheWrite: null,
		...overrides,
	};
}

describe('ExtraPricingBuckets', () => {
	it('shows only the add button when no bucket has a value', () => {
		render(
			<ExtraPricingBuckets
				pricing={makePricing()}
				isReadOnly={false}
				onChange={jest.fn()}
			/>,
		);

		expect(screen.getByTestId('drawer-add-bucket-btn')).toBeInTheDocument();
		expect(
			screen.queryByTestId('drawer-cache-read-cost'),
		).not.toBeInTheDocument();
		expect(screen.queryByTestId('drawer-cache-mode')).not.toBeInTheDocument();
	});

	it('opens the picker and adds a cache_read row with the cache mode select', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		render(
			<ExtraPricingBuckets
				pricing={makePricing()}
				isReadOnly={false}
				onChange={jest.fn()}
			/>,
		);

		await user.click(screen.getByTestId('drawer-add-bucket-btn'));
		expect(screen.getByTestId('drawer-bucket-picker')).toBeInTheDocument();

		await user.click(screen.getByTestId('drawer-add-bucket-cache-read'));

		expect(screen.getByTestId('drawer-cache-read-cost')).toBeInTheDocument();
		expect(screen.getByTestId('drawer-cache-mode')).toBeInTheDocument();
	});

	it('calls onChange with the cache_read value typed into the row', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const onChange = jest.fn();
		render(
			<ExtraPricingBuckets
				pricing={makePricing()}
				isReadOnly={false}
				onChange={onChange}
			/>,
		);

		await user.click(screen.getByTestId('drawer-add-bucket-btn'));
		await user.click(screen.getByTestId('drawer-add-bucket-cache-read'));

		fireEvent.change(screen.getByTestId('drawer-cache-read-cost'), {
			target: { value: '2' },
		});

		expect(onChange).toHaveBeenCalledWith({ cacheRead: 2 });
	});

	it('calls onChange with cacheRead null when the row is removed', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const onChange = jest.fn();
		render(
			<ExtraPricingBuckets
				pricing={makePricing({ cacheRead: 2 })}
				isReadOnly={false}
				onChange={onChange}
			/>,
		);

		await user.click(screen.getByTestId('drawer-remove-cache-read'));

		expect(onChange).toHaveBeenCalledWith({ cacheRead: null });
	});

	it('renders the cache_read row on mount when pricing already has a value', () => {
		render(
			<ExtraPricingBuckets
				pricing={makePricing({ cacheRead: 2 })}
				isReadOnly={false}
				onChange={jest.fn()}
			/>,
		);

		expect(screen.getByTestId('drawer-cache-read-cost')).toBeInTheDocument();
		expect(screen.getByTestId('drawer-cache-mode')).toBeInTheDocument();
	});

	it('hides the add and remove buttons when read-only', () => {
		render(
			<ExtraPricingBuckets
				pricing={makePricing({ cacheRead: 2 })}
				isReadOnly
				onChange={jest.fn()}
			/>,
		);

		expect(screen.queryByTestId('drawer-add-bucket-btn')).not.toBeInTheDocument();
		expect(
			screen.queryByTestId('drawer-remove-cache-read'),
		).not.toBeInTheDocument();
	});
});
