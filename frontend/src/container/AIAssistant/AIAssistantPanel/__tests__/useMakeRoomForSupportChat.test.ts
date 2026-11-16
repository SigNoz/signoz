import type { RefObject } from 'react';
import type {
	FloatingPanelHandle,
	FloatingPanelRect,
} from 'periscope/components/FloatingPanel/FloatingPanel';
import { act, renderHook } from 'tests/test-utils';

import { useMakeRoomForSupportChat } from '../useMakeRoomForSupportChat';

type PylonCallback = (() => void) | null;

const PANEL: FloatingPanelRect = { x: 852, y: 167, width: 420, height: 601 };
const SUPPORT_CHAT: FloatingPanelRect = {
	x: 882,
	y: 286,
	width: 384,
	height: 478,
};
// 8px gap left of the support chat: 882 - 8 - 420.
const CLEAR_OF_SUPPORT_CHAT = { x: 454, y: 167 };

const pylonCallbacks: Record<string, PylonCallback> = {};
const originalPylon = window.Pylon;

function showSupportChat(): void {
	const element = document.createElement('div');
	element.className = 'PylonChat-chatWindowFrameContainer';
	Object.defineProperties(element, {
		offsetLeft: { value: SUPPORT_CHAT.x },
		offsetTop: { value: SUPPORT_CHAT.y },
		offsetWidth: { value: SUPPORT_CHAT.width },
		offsetHeight: { value: SUPPORT_CHAT.height },
	});
	document.body.appendChild(element);
	act(() => pylonCallbacks.onShow?.());
}

function hideSupportChat(): void {
	act(() => pylonCallbacks.onHide?.());
}

function createPanel(initial: FloatingPanelRect): {
	ref: RefObject<FloatingPanelHandle>;
	moveTo: jest.MockedFunction<FloatingPanelHandle['moveTo']>;
	drag: (position: { x: number; y: number }) => void;
} {
	let rect = initial;
	const moveTo = jest.fn((position: { x: number; y: number }): void => {
		rect = { ...rect, ...position };
	});
	return {
		ref: { current: { getRect: (): FloatingPanelRect => rect, moveTo } },
		moveTo,
		drag: (position): void => {
			rect = { ...rect, ...position };
		},
	};
}

describe('useMakeRoomForSupportChat', () => {
	beforeEach(() => {
		pylonCallbacks.onShow = null;
		pylonCallbacks.onHide = null;
		window.Pylon = (command: string, callback?: unknown): void => {
			pylonCallbacks[command] =
				typeof callback === 'function' ? (callback as () => void) : null;
		};
	});

	afterEach(() => {
		window.Pylon = originalPylon;
		document
			.querySelectorAll('.PylonChat-chatWindowFrameContainer')
			.forEach((element) => element.remove());
	});

	it('slides the panel left of the support chat when the chat opens', () => {
		const panel = createPanel(PANEL);
		renderHook(() => useMakeRoomForSupportChat(panel.ref, true));

		showSupportChat();

		expect(panel.moveTo).toHaveBeenCalledWith(CLEAR_OF_SUPPORT_CHAT);
	});

	it('slides it back when the support chat closes', () => {
		const panel = createPanel(PANEL);
		renderHook(() => useMakeRoomForSupportChat(panel.ref, true));
		showSupportChat();

		hideSupportChat();

		expect(panel.moveTo).toHaveBeenLastCalledWith({ x: PANEL.x, y: PANEL.y });
	});

	it('leaves it where the user dragged it while the chat was open', () => {
		const panel = createPanel(PANEL);
		renderHook(() => useMakeRoomForSupportChat(panel.ref, true));
		showSupportChat();
		panel.drag({ x: 300, y: 120 });

		hideSupportChat();

		expect(panel.moveTo).toHaveBeenCalledTimes(1);
	});

	it('leaves a panel that already clears the support chat alone', () => {
		const panel = createPanel({ ...PANEL, x: 100 });
		renderHook(() => useMakeRoomForSupportChat(panel.ref, true));

		showSupportChat();

		expect(panel.moveTo).not.toHaveBeenCalled();
	});

	it('unregisters through the loaded widget, not the stub it registered with', () => {
		const stubCalls: string[] = [];
		window.Pylon = (command: string): void => {
			stubCalls.push(command);
		};
		const panel = createPanel(PANEL);
		const { unmount } = renderHook(() =>
			useMakeRoomForSupportChat(panel.ref, true),
		);
		const widgetCalls: [string, unknown][] = [];
		// Pylon's script swaps out the queueing stub, which then can no longer be called.
		window.Pylon = (command: string, callback?: unknown): void => {
			widgetCalls.push([command, callback]);
		};

		unmount();

		expect(stubCalls).toStrictEqual(['onShow', 'onHide']);
		expect(widgetCalls).toStrictEqual([
			['onShow', null],
			['onHide', null],
		]);
	});

	it('makes room when the support chat is already open as the panel opens', () => {
		const panel = createPanel(PANEL);
		showSupportChat();

		renderHook(() => useMakeRoomForSupportChat(panel.ref, true));

		expect(panel.moveTo).toHaveBeenCalledWith(CLEAR_OF_SUPPORT_CHAT);
	});
});
