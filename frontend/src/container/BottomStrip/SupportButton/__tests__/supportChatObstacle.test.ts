import type { FloatingRect } from 'periscope/components/FloatingPanel/types';

import { supportChatObstacle } from '../supportChatObstacle';

type Pylon = Window['Pylon'];

const SUPPORT_CHAT: FloatingRect = { x: 882, y: 286, width: 384, height: 478 };
const CLOSED_CLASS = 'PylonChat-chatWindowFrameContainer--closed';

const originalPylon = window.Pylon;
const pylonCallbacks = new Map<string, unknown>();
const unsubscribes: (() => void)[] = [];

function subscribe(onChange: () => void): () => void {
	const unsubscribe = supportChatObstacle.subscribe(onChange);
	unsubscribes.push(unsubscribe);
	return unsubscribe;
}

function installPylon(): jest.MockedFunction<Pylon> {
	const pylon = jest.fn<ReturnType<Pylon>, Parameters<Pylon>>(
		(command, callback) => {
			pylonCallbacks.set(command, callback);
		},
	);
	window.Pylon = pylon;
	return pylon;
}

function firePylon(event: 'onShow' | 'onHide'): void {
	const callback = pylonCallbacks.get(event);
	if (typeof callback === 'function') {
		callback();
	}
}

function renderSupportChat(): HTMLElement {
	const element = document.createElement('div');
	element.className = 'PylonChat-chatWindowFrameContainer';
	Object.defineProperties(element, {
		offsetLeft: { value: SUPPORT_CHAT.x },
		offsetTop: { value: SUPPORT_CHAT.y },
		offsetWidth: { value: SUPPORT_CHAT.width },
		offsetHeight: { value: SUPPORT_CHAT.height },
	});
	document.body.appendChild(element);
	return element;
}

describe('supportChatObstacle', () => {
	beforeEach(() => pylonCallbacks.clear());

	afterEach(() => {
		unsubscribes.splice(0).forEach((unsubscribe) => unsubscribe());
		window.Pylon = originalPylon;
		document.body.innerHTML = '';
	});

	it('reports the chat window box only while it is open', () => {
		const chat = renderSupportChat();

		expect(supportChatObstacle.getRect()).toStrictEqual(SUPPORT_CHAT);

		chat.classList.add(CLOSED_CLASS);

		expect(supportChatObstacle.getRect()).toBeNull();
	});

	it('treats the chat as closed once Pylon reports it hidden', () => {
		installPylon();
		renderSupportChat();
		subscribe(jest.fn());

		firePylon('onHide');

		expect(supportChatObstacle.getRect()).toBeNull();
	});

	it('notifies every subscriber through one Pylon registration', () => {
		const pylon = installPylon();
		const first = jest.fn() as jest.MockedFunction<() => void>;
		const second = jest.fn() as jest.MockedFunction<() => void>;
		subscribe(first);
		subscribe(second);

		firePylon('onShow');

		expect(pylon.mock.calls.map(([command]) => command)).toStrictEqual([
			'onShow',
			'onHide',
		]);
		expect(first).toHaveBeenCalledTimes(1);
		expect(second).toHaveBeenCalledTimes(1);
	});

	it('unregisters through the loaded widget, not the stub it registered with', () => {
		const stub = installPylon();
		const unsubscribe = subscribe(jest.fn());
		// Pylon's script swaps out the queueing stub, which then can no longer be called.
		const widget = installPylon();

		unsubscribe();

		expect(stub.mock.calls.map(([command]) => command)).toStrictEqual([
			'onShow',
			'onHide',
		]);
		expect(widget.mock.calls).toStrictEqual([
			['onShow', null],
			['onHide', null],
		]);
	});
});
