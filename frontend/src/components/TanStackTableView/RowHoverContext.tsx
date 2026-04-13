/* eslint-disable no-restricted-imports */
import {
	createContext,
	ReactNode,
	useCallback,
	useContext,
	useRef,
} from 'react';
/* eslint-enable no-restricted-imports */
import { createStore, StoreApi, useStore } from 'zustand';

const CLEAR_HOVER_DELAY_MS = 100;

type RowHoverState = {
	hoveredRowId: string | null;
	clearTimeoutId: ReturnType<typeof setTimeout> | null;
	setHoveredRowId: (id: string | null) => void;
	scheduleClearHover: (rowId: string) => void;
};

const createRowHoverStore = (): StoreApi<RowHoverState> =>
	createStore<RowHoverState>((set, get) => ({
		hoveredRowId: null,
		clearTimeoutId: null,
		setHoveredRowId: (id: string | null): void => {
			const { clearTimeoutId } = get();
			if (clearTimeoutId) {
				clearTimeout(clearTimeoutId);
				set({ clearTimeoutId: null });
			}
			set({ hoveredRowId: id });
		},
		scheduleClearHover: (rowId: string): void => {
			const { clearTimeoutId } = get();
			if (clearTimeoutId) {
				clearTimeout(clearTimeoutId);
			}
			const timeoutId = setTimeout(() => {
				const current = get().hoveredRowId;
				if (current === rowId) {
					set({ hoveredRowId: null, clearTimeoutId: null });
				}
			}, CLEAR_HOVER_DELAY_MS);
			set({ clearTimeoutId: timeoutId });
		},
	}));

type RowHoverStore = StoreApi<RowHoverState>;

const RowHoverContext = createContext<RowHoverStore | null>(null);

export function RowHoverProvider({
	children,
}: {
	children: ReactNode;
}): JSX.Element {
	const storeRef = useRef<RowHoverStore | null>(null);
	if (!storeRef.current) {
		storeRef.current = createRowHoverStore();
	}
	return (
		<RowHoverContext.Provider value={storeRef.current}>
			{children}
		</RowHoverContext.Provider>
	);
}

const defaultStore = createRowHoverStore();

export const useIsRowHovered = (rowId: string): boolean => {
	const store = useContext(RowHoverContext);
	// Selector returns true only if this specific row is hovered
	const isHovered = useStore(
		store ?? defaultStore,
		(s) => s.hoveredRowId === rowId,
	);
	return store ? isHovered : false;
};

export const useSetRowHovered = (rowId: string): (() => void) => {
	const store = useContext(RowHoverContext);
	return useCallback(() => {
		if (store) {
			const current = store.getState().hoveredRowId;
			if (current !== rowId) {
				store.getState().setHoveredRowId(rowId);
			}
		}
	}, [store, rowId]);
};

export const useClearRowHovered = (rowId: string): (() => void) => {
	const store = useContext(RowHoverContext);
	return useCallback(() => {
		if (store) {
			store.getState().scheduleClearHover(rowId);
		}
	}, [store, rowId]);
};

export default RowHoverContext;
