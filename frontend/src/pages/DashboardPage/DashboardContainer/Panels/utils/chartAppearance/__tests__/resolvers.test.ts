import {
	DashboardtypesAreaFillModeDTO,
	DashboardtypesStackModeDTO,
} from 'api/generated/services/sigNoz.schemas';
import { FillMode, StackMode } from 'lib/uPlotV2/config/types';

import {
	resolveAreaFillMode,
	resolveSpanGaps,
	resolveStackMode,
} from '../resolvers';

describe('resolveSpanGaps', () => {
	it('parses a duration string into seconds when thresholding', () => {
		expect(resolveSpanGaps({ fillOnlyBelow: true, fillLessThan: '5s' })).toBe(5);
		expect(resolveSpanGaps({ fillOnlyBelow: true, fillLessThan: '10m' })).toBe(
			600,
		);
		expect(resolveSpanGaps({ fillOnlyBelow: true, fillLessThan: '1h' })).toBe(
			3600,
		);
	});

	it('tolerates a bare seconds number (back-compat)', () => {
		expect(resolveSpanGaps({ fillOnlyBelow: true, fillLessThan: '600' })).toBe(
			600,
		);
	});

	it('falls back to true for unparseable input', () => {
		expect(resolveSpanGaps({ fillOnlyBelow: true, fillLessThan: 'abc' })).toBe(
			true,
		);
	});

	it('spans all gaps when fillOnlyBelow is explicitly false, ignoring any duration', () => {
		expect(resolveSpanGaps({ fillOnlyBelow: false, fillLessThan: '5m' })).toBe(
			true,
		);
	});

	it('treats a duration with no fillOnlyBelow flag as a threshold (legacy panels)', () => {
		expect(resolveSpanGaps({ fillLessThan: '5m' })).toBe(300);
	});
});

describe('resolveAreaFillMode', () => {
	it('maps each wire value to its chart fill mode', () => {
		expect(resolveAreaFillMode(DashboardtypesAreaFillModeDTO.solid)).toBe(
			FillMode.Solid,
		);
		expect(resolveAreaFillMode(DashboardtypesAreaFillModeDTO.gradient)).toBe(
			FillMode.Gradient,
		);
	});

	// Includes a stale `none`, which the area wire enum no longer carries.
	it('falls back to solid for a missing or unknown value', () => {
		expect(resolveAreaFillMode(undefined)).toBe(FillMode.Solid);
		expect(resolveAreaFillMode('none' as DashboardtypesAreaFillModeDTO)).toBe(
			FillMode.Solid,
		);
	});
});

describe('resolveStackMode', () => {
	it('maps each wire value to its chart stack mode', () => {
		expect(resolveStackMode(DashboardtypesStackModeDTO.none)).toBe(
			StackMode.None,
		);
		expect(resolveStackMode(DashboardtypesStackModeDTO.normal)).toBe(
			StackMode.Normal,
		);
		expect(resolveStackMode(DashboardtypesStackModeDTO.percent)).toBe(
			StackMode.Percent,
		);
	});

	it('falls back to none for a missing or unknown value', () => {
		expect(resolveStackMode(undefined)).toBe(StackMode.None);
		expect(resolveStackMode('stretch' as DashboardtypesStackModeDTO)).toBe(
			StackMode.None,
		);
	});
});
