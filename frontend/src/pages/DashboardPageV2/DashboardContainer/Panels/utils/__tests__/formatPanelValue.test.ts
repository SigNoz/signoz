import { PrecisionOptionsEnum } from 'components/Graph/types';

import { formatPanelValue } from '../formatPanelValue';

describe('formatPanelValue', () => {
	it('applies the configured precision and appends the unit label', () => {
		// The unit-aware formatter returns value + label as one string; the
		// ValueDisplay splits it into numeric/suffix parts when rendering.
		expect(formatPanelValue(295.4299833508185, 'ms', 2)).toBe('295.43 ms');
	});

	// Regression: precision must apply even with no unit. The old gate
	// (`unit ? format() : value.toString()`) dropped precision on unitless
	// panels, so decimal-precision changes had no visible effect.
	it('applies precision when NO unit is set', () => {
		expect(formatPanelValue(3.14159, undefined, 2)).toBe('3.14');
		expect(formatPanelValue(3.14159, '', 2)).toBe('3.14');
	});

	it('honors full precision without a unit', () => {
		expect(formatPanelValue(3.14159, undefined, PrecisionOptionsEnum.FULL)).toBe(
			'3.14159',
		);
	});

	it('drops the fractional part at precision 0', () => {
		expect(formatPanelValue(3.14159, undefined, 0)).toBe('3');
	});

	it('renders whole numbers without a trailing decimal', () => {
		expect(formatPanelValue(5, undefined, 2)).toBe('5');
	});
});
