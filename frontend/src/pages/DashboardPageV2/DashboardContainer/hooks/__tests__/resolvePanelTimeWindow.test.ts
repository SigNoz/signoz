import { DashboardtypesTimePreferenceDTO } from 'api/generated/services/sigNoz.schemas';

import { resolvePanelTimeWindow } from '../resolvePanelTimeWindow';

const GLOBAL_START = 1_000_000;
const GLOBAL_END = 5_000_000;

describe('resolvePanelTimeWindow', () => {
	it('uses the dashboard window when there is no preference', () => {
		expect(
			resolvePanelTimeWindow({
				timePreference: undefined,
				globalStartMs: GLOBAL_START,
				globalEndMs: GLOBAL_END,
			}),
		).toStrictEqual({ startMs: GLOBAL_START, endMs: GLOBAL_END });
	});

	it('uses the dashboard window for global_time', () => {
		expect(
			resolvePanelTimeWindow({
				timePreference: DashboardtypesTimePreferenceDTO.global_time,
				globalStartMs: GLOBAL_START,
				globalEndMs: GLOBAL_END,
			}),
		).toStrictEqual({ startMs: GLOBAL_START, endMs: GLOBAL_END });
	});

	it('anchors a relative preset to the dashboard end', () => {
		expect(
			resolvePanelTimeWindow({
				timePreference: DashboardtypesTimePreferenceDTO.last_5_min,
				globalStartMs: GLOBAL_START,
				globalEndMs: GLOBAL_END,
			}),
		).toStrictEqual({ startMs: GLOBAL_END - 5 * 60 * 1000, endMs: GLOBAL_END });
	});

	it('resolves the larger presets to the V1-equivalent spans', () => {
		const cases: [DashboardtypesTimePreferenceDTO, number][] = [
			[DashboardtypesTimePreferenceDTO.last_1_hr, 60],
			[DashboardtypesTimePreferenceDTO.last_1_day, 24 * 60],
			[DashboardtypesTimePreferenceDTO.last_1_week, 7 * 24 * 60],
			[DashboardtypesTimePreferenceDTO.last_1_month, 30 * 24 * 60],
		];
		cases.forEach(([pref, minutes]) => {
			expect(
				resolvePanelTimeWindow({
					timePreference: pref,
					globalStartMs: GLOBAL_START,
					globalEndMs: GLOBAL_END,
				}),
			).toStrictEqual({
				startMs: GLOBAL_END - minutes * 60 * 1000,
				endMs: GLOBAL_END,
			});
		});
	});

	it('lets an explicit override win over the preference', () => {
		expect(
			resolvePanelTimeWindow({
				timePreference: DashboardtypesTimePreferenceDTO.last_5_min,
				globalStartMs: GLOBAL_START,
				globalEndMs: GLOBAL_END,
				override: { startMs: 42, endMs: 99 },
			}),
		).toStrictEqual({ startMs: 42, endMs: 99 });
	});

	it('floors fractional milliseconds', () => {
		expect(
			resolvePanelTimeWindow({
				timePreference: undefined,
				globalStartMs: 1.9,
				globalEndMs: 9.9,
			}),
		).toStrictEqual({ startMs: 1, endMs: 9 });

		expect(
			resolvePanelTimeWindow({
				timePreference: DashboardtypesTimePreferenceDTO.last_5_min,
				globalStartMs: 0,
				globalEndMs: 9.9,
				override: { startMs: 4.7, endMs: 8.2 },
			}),
		).toStrictEqual({ startMs: 4, endMs: 8 });
	});
});
