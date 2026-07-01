import { useCallback, useEffect, useState } from 'react';

import type { BrandedPermission } from '../../hooks/useAuthZ/types';
import type { OverrideState } from '../types';
import { OVERRIDE_CYCLE } from '../types';

type UseModalKeyboardOptions = {
	permissions: BrandedPermission[];
	overrides: Record<string, OverrideState>;
	onCycle: (permission: BrandedPermission) => void;
	onSetOverride: (permission: BrandedPermission, state: OverrideState) => void;
	onClose: () => void;
	searchInputRef: React.RefObject<HTMLInputElement | null>;
};

type UseModalKeyboardResult = {
	selectedIndex: number;
	setSelectedIndex: (index: number) => void;
};

type KeyContext = {
	permissions: BrandedPermission[];
	overrides: Record<string, OverrideState>;
	selectedIndex: number;
	setSelectedIndex: React.Dispatch<React.SetStateAction<number>>;
	onCycle: (permission: BrandedPermission) => void;
	onSetOverride: (permission: BrandedPermission, state: OverrideState) => void;
};

const ARROW_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

const NUMBER_KEY_INDEX: Record<string, number> = {
	'1': 0,
	'2': 1,
	'3': 2,
	'4': 3,
	'5': 4,
};

function stepOverrideState(
	current: OverrideState,
	direction: number,
): OverrideState {
	const currentIndex = OVERRIDE_CYCLE.indexOf(current);
	const nextIndex =
		(currentIndex + direction + OVERRIDE_CYCLE.length) % OVERRIDE_CYCLE.length;
	return OVERRIDE_CYCLE[nextIndex];
}

// Arrow keys stay active even while the search input is focused so the list can
// be driven without leaving the search field.
function handleArrowKey(key: string, ctx: KeyContext): void {
	if (key === 'ArrowDown') {
		ctx.setSelectedIndex((prev) =>
			Math.min(prev + 1, ctx.permissions.length - 1),
		);
		return;
	}
	if (key === 'ArrowUp') {
		ctx.setSelectedIndex((prev) => Math.max(prev - 1, 0));
		return;
	}
	const selected = ctx.permissions[ctx.selectedIndex];
	if (!selected) {
		return;
	}
	const direction = key === 'ArrowLeft' ? -1 : 1;
	ctx.onSetOverride(
		selected,
		stepOverrideState(ctx.overrides[selected] ?? 'reset', direction),
	);
}

// Number and space/enter shortcuts type into the search field, so they only run
// when it is not focused. Returns whether the key was handled.
function handleActionKey(key: string, ctx: KeyContext): boolean {
	const selected = ctx.permissions[ctx.selectedIndex];
	const numberIndex = NUMBER_KEY_INDEX[key];
	if (numberIndex !== undefined) {
		if (selected) {
			ctx.onSetOverride(selected, OVERRIDE_CYCLE[numberIndex]);
		}
		return true;
	}
	if (key === ' ' || key === 'Enter') {
		if (selected) {
			ctx.onCycle(selected);
		}
		return true;
	}
	return false;
}

export function useModalKeyboard({
	permissions,
	overrides,
	onCycle,
	onSetOverride,
	onClose,
	searchInputRef,
}: UseModalKeyboardOptions): UseModalKeyboardResult {
	// Start with no selection (-1) to avoid accidental override changes from
	// Enter keypress that opened the modal also triggering cycleOverride.
	const [selectedIndex, setSelectedIndex] = useState(-1);

	const handleKeyDown = useCallback(
		(e: KeyboardEvent) => {
			const isSearchFocused = document.activeElement === searchInputRef.current;

			if (e.key === 'Escape') {
				e.preventDefault();
				onClose();
				return;
			}

			if (e.key === '/') {
				if (!isSearchFocused) {
					e.preventDefault();
					searchInputRef.current?.focus();
				}
				return;
			}

			const ctx: KeyContext = {
				permissions,
				overrides,
				selectedIndex,
				setSelectedIndex,
				onCycle,
				onSetOverride,
			};

			if (ARROW_KEYS.has(e.key)) {
				e.preventDefault();
				handleArrowKey(e.key, ctx);
				return;
			}

			if (isSearchFocused) {
				return;
			}

			if (handleActionKey(e.key, ctx)) {
				e.preventDefault();
			}
		},
		[
			permissions,
			overrides,
			selectedIndex,
			onCycle,
			onSetOverride,
			onClose,
			searchInputRef,
		],
	);

	useEffect((): (() => void) => {
		window.addEventListener('keydown', handleKeyDown);
		return (): void => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [handleKeyDown]);

	useEffect((): void => {
		if (selectedIndex >= permissions.length && permissions.length > 0) {
			setSelectedIndex(permissions.length - 1);
		}
	}, [permissions.length, selectedIndex]);

	return {
		selectedIndex,
		setSelectedIndex,
	};
}
