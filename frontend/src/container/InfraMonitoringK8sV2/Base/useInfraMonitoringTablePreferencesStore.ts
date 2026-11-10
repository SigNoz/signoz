import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CellTypographySize } from 'components/TanStackTableView';

export type FontSize = CellTypographySize;

export interface IInfraMonitoringTablePreferencesStore {
	lineClamp: number;
	fontSize: FontSize;
	increaseLineClamp: () => void;
	decreaseLineClamp: () => void;
	setLineClamp: (value: number) => void;
	setFontSize: (value: FontSize) => void;
}

const MIN_LINE_CLAMP = 1;
const MAX_LINE_CLAMP = 10;
const DEFAULT_LINE_CLAMP = 1;
const DEFAULT_FONT_SIZE: FontSize = 'medium';

export const useInfraMonitoringTablePreferencesStore =
	create<IInfraMonitoringTablePreferencesStore>()(
		persist(
			(set, get) => ({
				lineClamp: DEFAULT_LINE_CLAMP,
				fontSize: DEFAULT_FONT_SIZE,
				increaseLineClamp: (): void => {
					const current = get().lineClamp;
					if (current < MAX_LINE_CLAMP) {
						set({ lineClamp: current + 1 });
					}
				},
				decreaseLineClamp: (): void => {
					const current = get().lineClamp;
					if (current > MIN_LINE_CLAMP) {
						set({ lineClamp: current - 1 });
					}
				},
				setLineClamp: (value: number): void => {
					if (value >= MIN_LINE_CLAMP && value <= MAX_LINE_CLAMP) {
						set({ lineClamp: value });
					}
				},
				setFontSize: (value: FontSize): void => {
					set({ fontSize: value });
				},
			}),
			{
				name: '@signoz/infra-monitoring-table-preferences',
			},
		),
	);

export const useInfraMonitoringLineClamp = (): number =>
	useInfraMonitoringTablePreferencesStore((s) => s.lineClamp);

export const useInfraMonitoringFontSize = (): FontSize =>
	useInfraMonitoringTablePreferencesStore((s) => s.fontSize);
