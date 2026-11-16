import { RefObject, useEffect } from 'react';
import type {
	FloatingPanelHandle,
	FloatingPanelRect,
} from 'periscope/components/FloatingPanel/FloatingPanel';

// Pylon's own class names, which styles.scss also targets.
const SUPPORT_CHAT_SELECTOR = '.PylonChat-chatWindowFrameContainer';
const SUPPORT_CHAT_CLOSED_CLASS = 'PylonChat-chatWindowFrameContainer--closed';
const GAP = 8;

interface Position {
	x: number;
	y: number;
}

/** Where the panel clears the support chat, or null when they don't overlap. */
export function getPositionClearOf(
	panel: FloatingPanelRect,
	supportChat: FloatingPanelRect,
): Position | null {
	const overlaps =
		panel.x < supportChat.x + supportChat.width &&
		supportChat.x < panel.x + panel.width &&
		panel.y < supportChat.y + supportChat.height &&
		supportChat.y < panel.y + panel.height;
	if (!overlaps) {
		return null;
	}
	return { x: Math.max(GAP, supportChat.x - GAP - panel.width), y: panel.y };
}

// Offsets ignore the scale animation Pylon opens with, so this is the settled box.
function getSupportChatRect(): FloatingPanelRect | null {
	const element = document.querySelector<HTMLElement>(SUPPORT_CHAT_SELECTOR);
	if (!element || element.classList.contains(SUPPORT_CHAT_CLOSED_CLASS)) {
		return null;
	}
	return {
		x: element.offsetLeft,
		y: element.offsetTop,
		width: element.offsetWidth,
		height: element.offsetHeight,
	};
}

function isAt(rect: FloatingPanelRect, position: Position): boolean {
	return Math.abs(rect.x - position.x) < 1 && Math.abs(rect.y - position.y) < 1;
}

/**
 * Slides the panel left of the support chat while it is open, and back once it
 * closes unless the user has moved the panel since.
 */
export function useMakeRoomForSupportChat(
	panelRef: RefObject<FloatingPanelHandle>,
	isPanelOpen: boolean,
): void {
	useEffect(() => {
		if (!isPanelOpen || !window.Pylon) {
			return undefined;
		}

		let move: { from: Position; to: Position } | null = null;

		const makeRoom = (): void => {
			const panel = panelRef.current?.getRect();
			const supportChat = getSupportChatRect();
			const to = panel && supportChat && getPositionClearOf(panel, supportChat);
			if (!panel || !to) {
				return;
			}
			move = { from: { x: panel.x, y: panel.y }, to };
			panelRef.current?.moveTo(to);
		};

		const giveRoomBack = (): void => {
			const panel = panelRef.current?.getRect();
			if (move && panel && isAt(panel, move.to)) {
				panelRef.current?.moveTo(move.from);
			}
			move = null;
		};

		// Pylon keeps a single callback per event; nothing else registers these.
		window.Pylon('onShow', makeRoom);
		window.Pylon('onHide', giveRoomBack);
		// The support chat may already be open when the panel opens.
		makeRoom();

		return (): void => {
			// Read `window.Pylon` again: once loaded, the widget replaces the stub, which then throws.
			window.Pylon?.('onShow', null);
			window.Pylon?.('onHide', null);
		};
	}, [isPanelOpen, panelRef]);
}
