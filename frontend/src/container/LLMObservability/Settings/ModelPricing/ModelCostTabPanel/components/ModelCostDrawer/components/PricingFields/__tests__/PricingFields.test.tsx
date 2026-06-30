import { LlmpricingruletypesLLMPricingRuleCacheModeDTO as CacheModeDTO } from 'api/generated/services/sigNoz.schemas';
import { fireEvent, render, screen } from 'tests/test-utils';

import type { DrawerDraft } from '../../../../../../types';
import PricingFields from '../PricingFields';

type Pricing = DrawerDraft['pricing'];

function makePricing(overrides: Partial<Pricing> = {}): Pricing {
	return {
		input: null,
		output: null,
		cacheMode: CacheModeDTO.unknown,
		cacheRead: null,
		cacheWrite: null,
		...overrides,
	};
}

describe('PricingFields', () => {
	it('calls onChange with the parsed input cost', () => {
		const onChange = jest.fn();
		render(
			<PricingFields
				pricing={makePricing()}
				isReadOnly={false}
				onChange={onChange}
			/>,
		);

		fireEvent.change(screen.getByTestId('drawer-input-cost'), {
			target: { value: '5' },
		});

		expect(onChange).toHaveBeenCalledWith({ input: 5 });
	});

	it('calls onChange with the parsed output cost', () => {
		const onChange = jest.fn();
		render(
			<PricingFields
				pricing={makePricing()}
				isReadOnly={false}
				onChange={onChange}
			/>,
		);

		fireEvent.change(screen.getByTestId('drawer-output-cost'), {
			target: { value: '12' },
		});

		expect(onChange).toHaveBeenCalledWith({ output: 12 });
	});

	it('calls onChange with null when the input is cleared', () => {
		const onChange = jest.fn();
		render(
			<PricingFields
				pricing={makePricing({ input: 5 })}
				isReadOnly={false}
				onChange={onChange}
			/>,
		);

		fireEvent.change(screen.getByTestId('drawer-input-cost'), {
			target: { value: '' },
		});

		expect(onChange).toHaveBeenCalledWith({ input: null });
	});

	it('disables the inputs and shows the read-only label when read-only', () => {
		render(
			<PricingFields
				pricing={makePricing({ input: 3, output: 9 })}
				isReadOnly
				onChange={jest.fn()}
			/>,
		);

		expect(screen.getByTestId('drawer-input-cost')).toBeDisabled();
		expect(screen.getByTestId('drawer-output-cost')).toBeDisabled();
		expect(screen.getByTestId('drawer-readonly-label')).toBeInTheDocument();
	});
});
