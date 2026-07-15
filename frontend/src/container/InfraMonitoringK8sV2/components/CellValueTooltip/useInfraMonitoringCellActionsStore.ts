import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface IInfraMonitoringCellActionsStore {
	lineClamp: number;
	increaseLineClamp: () => void;
	decreaseLineClamp: () => void;
}

const MIN_LINE_CLAMP = 1;
const MAX_LINE_CLAMP = 10;
const DEFAULT_LINE_CLAMP = 2;

export const useInfraMonitoringCellActionsStore =
	create<IInfraMonitoringCellActionsStore>()(
		persist(
			(set, get) => ({
				lineClamp: DEFAULT_LINE_CLAMP,
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
			}),
			{
				name: '@signoz/infra-monitoring-cell-actions',
			},
		),
	);

export const useInfraMonitoringLineClamp = (): number =>
	useInfraMonitoringCellActionsStore((s) => s.lineClamp);
