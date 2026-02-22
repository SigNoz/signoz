import { Axis } from 'uplot';

/**
 * Calculate text width for longest value
 */
export function calculateTextWidth(
	self: uPlot,
	axis: Axis,
	values: string[] | undefined,
): number {
	if (!values || values.length === 0) {
		return 0;
	}

	// Find longest value
	const longestVal = values.reduce(
		(acc, val) => (val.length > acc.length ? val : acc),
		'',
	);

	if (longestVal === '' || !axis.font?.[0]) {
		return 0;
	}

	self.ctx.font = axis.font[0];
	return self.ctx.measureText(longestVal).width / devicePixelRatio;
}

export function getExistingAxisSize({
	uplotInstance,
	axis,
	values,
	axisIdx,
	cycleNum,
}: {
	uplotInstance: uPlot;
	axis: Axis;
	values?: string[];
	axisIdx: number;
	cycleNum: number;
}): number {
	const internalSize = (axis as { _size?: number })._size;
	if (internalSize !== undefined) {
		return internalSize;
	}

	const existingSize = axis.size;
	if (typeof existingSize === 'function') {
		return existingSize(uplotInstance, values ?? [], axisIdx, cycleNum);
	}

	return existingSize ?? 0;
}

export function buildYAxisSizeCalculator(gap: number): uPlot.Axis.Size {
	return (
		self: uPlot,
		values: string[] | undefined,
		axisIdx: number,
		cycleNum: number,
	): number => {
		const axis = self.axes[axisIdx];

		// Bail out, force convergence
		if (cycleNum > 1) {
			return getExistingAxisSize({
				uplotInstance: self,
				axis,
				values,
				axisIdx,
				cycleNum,
			});
		}

		let axisSize = (axis.ticks?.size ?? 0) + gap;
		axisSize += calculateTextWidth(self, axis, values);

		return Math.ceil(axisSize);
	};
}
