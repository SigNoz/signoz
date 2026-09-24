import { create } from 'zustand';

import type { PricingRule, UnpricedModel } from '../types';
import { getRuleOptionLabel } from '../utils';

// A model + the billing rule it's about to be mapped onto, held while the confirm
// dialog is open.
export interface PendingMapping {
	model: UnpricedModel;
	rule: PricingRule;
}

interface PendingMappingState {
	pending: PendingMapping | null;
	setPending: (mapping: PendingMapping) => void;
	clearPending: () => void;
}

// The staged mapping lives in a store (not component state/props) because the
// row's select trigger, which mirrors the staged pick, sits inside a memoized
// TanStackTable cell whose value is cached per row — a prop/context change would
// not re-render it, but a store subscription does. Picking a billing model stages
// a single mapping for confirmation; it only commits once confirmed in the dialog.
export const usePendingMappingStore = create<PendingMappingState>((set) => ({
	pending: null,
	setPending: (mapping): void => set({ pending: mapping }),
	clearPending: (): void => set({ pending: null }),
}));

// Label to show on the given row's select trigger while its mapping is staged, or
// undefined when nothing is staged for that row (falls back to the placeholder).
export const usePendingMappingLabel = (modelName: string): string | undefined =>
	usePendingMappingStore((state) => {
		const { pending } = state;
		if (!pending || pending.model.modelName !== modelName) {
			return undefined;
		}
		return getRuleOptionLabel(pending.rule);
	});
