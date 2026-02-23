import uPlot from 'uplot';

import { calculateWidthBasedOnStepInterval } from '../index';

describe('calculateWidthBasedOnStepInterval', () => {
	it('returns pixel width between start and start+stepInterval when xScale exists with numeric min', () => {
		const valToPos = jest
			.fn()
			.mockReturnValueOnce(100) // startPx for start
			.mockReturnValueOnce(250); // endPx for start + stepInterval

		const uPlotInstance = ({
			scales: { x: { min: 1000 } },
			valToPos,
		} as unknown) as uPlot;

		const result = calculateWidthBasedOnStepInterval({
			uPlotInstance,
			stepInterval: 60,
		});

		expect(valToPos).toHaveBeenCalledWith(1000, 'x');
		expect(valToPos).toHaveBeenCalledWith(1060, 'x');
		expect(result).toBe(150); // Math.abs(250 - 100)
	});

	it('returns absolute pixel width when endPx is less than startPx', () => {
		const valToPos = jest.fn().mockReturnValueOnce(250).mockReturnValueOnce(100);

		const uPlotInstance = ({
			scales: { x: { min: 0 } },
			valToPos,
		} as unknown) as uPlot;

		const result = calculateWidthBasedOnStepInterval({
			uPlotInstance,
			stepInterval: 60,
		});

		expect(result).toBe(150); // Math.abs(100 - 250)
	});

	it('returns 0 when xScale is undefined', () => {
		const uPlotInstance = ({
			scales: { x: undefined },
			valToPos: jest.fn(),
		} as unknown) as uPlot;

		const result = calculateWidthBasedOnStepInterval({
			uPlotInstance,
			stepInterval: 60,
		});

		expect(result).toBe(0);
	});

	it('returns 0 when xScale.min is not a number', () => {
		const uPlotInstance = ({
			scales: { x: { min: undefined } },
			valToPos: jest.fn(),
		} as unknown) as uPlot;

		const result = calculateWidthBasedOnStepInterval({
			uPlotInstance,
			stepInterval: 60,
		});

		expect(result).toBe(0);
	});
});
