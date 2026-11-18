import type {
	FloatingObstacle,
	FloatingRect,
} from 'periscope/components/FloatingPanel/types';

// Pylon's own class names, which styles.scss also targets.
const SUPPORT_CHAT_SELECTOR = '.PylonChat-chatWindowFrameContainer';
const SUPPORT_CHAT_CLOSED_CLASS = 'PylonChat-chatWindowFrameContainer--closed';

const listeners = new Set<() => void>();
// Pylon's last show/hide while subscribed; undefined until one arrives.
let isOpen: boolean | undefined;

function setOpen(open: boolean): void {
	isOpen = open;
	listeners.forEach((listener) => listener());
}

const onShow = (): void => setOpen(true);
const onHide = (): void => setOpen(false);

// Offsets ignore the scale animation Pylon opens with, so this is the settled box.
function getSupportChatRect(): FloatingRect | null {
	const element = document.querySelector<HTMLElement>(SUPPORT_CHAT_SELECTOR);
	if (!element) {
		return null;
	}
	// Pylon's event decides; the class covers a chat opened before anyone subscribed.
	if (!(isOpen ?? !element.classList.contains(SUPPORT_CHAT_CLOSED_CLASS))) {
		return null;
	}
	return {
		x: element.offsetLeft,
		y: element.offsetTop,
		width: element.offsetWidth,
		height: element.offsetHeight,
	};
}

function subscribeToSupportChat(onChange: () => void): () => void {
	if (!window.Pylon) {
		return (): void => undefined;
	}
	listeners.add(onChange);
	// Pylon keeps a single callback per event, so all listeners share one registration.
	if (listeners.size === 1) {
		window.Pylon('onShow', onShow);
		window.Pylon('onHide', onHide);
	}
	return (): void => {
		listeners.delete(onChange);
		if (listeners.size === 0) {
			isOpen = undefined;
			// Read `window.Pylon` again: once loaded, the widget replaces the stub, which then throws.
			window.Pylon?.('onShow', null);
			window.Pylon?.('onHide', null);
		}
	};
}

export const supportChatObstacle: FloatingObstacle = {
	getRect: getSupportChatRect,
	subscribe: subscribeToSupportChat,
};
