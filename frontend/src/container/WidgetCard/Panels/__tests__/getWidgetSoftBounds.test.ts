import { getWidgetSoftBounds } from '../utils';

describe('getWidgetSoftBounds', () => {
	it("drops v1's 0/0 unset default", () => {
		expect(getWidgetSoftBounds({ softMin: 0, softMax: 0 })).toStrictEqual({});
	});

	it('keeps a lone 0, which is a deliberate bound', () => {
		expect(getWidgetSoftBounds({ softMin: 0, softMax: null })).toStrictEqual({
			softMin: 0,
			softMax: undefined,
		});
		expect(getWidgetSoftBounds({ softMin: null, softMax: 0 })).toStrictEqual({
			softMin: undefined,
			softMax: 0,
		});
	});

	it('keeps real bounds and normalises null to undefined', () => {
		expect(getWidgetSoftBounds({ softMin: 0, softMax: 100 })).toStrictEqual({
			softMin: 0,
			softMax: 100,
		});
		expect(getWidgetSoftBounds({ softMin: null, softMax: null })).toStrictEqual({
			softMin: undefined,
			softMax: undefined,
		});
	});
});
