import getLocalStorageKey from 'api/browser/localstorage/get';
import setLocalStorageKey from 'api/browser/localstorage/set';

import {
	AI_ASSISTANT_OPEN_CONVERSATIONS_STORAGE_KEY,
	useAIAssistantOpenConversationsStore,
} from '../useAIAssistantOpenConversationsStore';

const initialTabsState = useAIAssistantOpenConversationsStore.getState();

function openAll(ids: string[]): void {
	ids.forEach((id) => useAIAssistantOpenConversationsStore.getState().open(id));
}

const tabs = (): string[] =>
	useAIAssistantOpenConversationsStore.getState().threadIds;

describe('useAIAssistantOpenConversationsStore', () => {
	afterEach(() => {
		useAIAssistantOpenConversationsStore.setState(initialTabsState, true);
		localStorage.clear();
	});

	it('opens a tab once, in open order', () => {
		openAll(['a', 'b', 'a']);

		expect(tabs()).toStrictEqual(['a', 'b']);
	});

	it('past the cap drops the oldest tab', () => {
		openAll(['a', 'b', 'c', 'd', 'e', 'f']);

		expect(tabs()).toStrictEqual(['b', 'c', 'd', 'e', 'f']);
	});

	it('closes and prunes tabs', () => {
		openAll(['a', 'b', 'c', 'd']);

		useAIAssistantOpenConversationsStore.getState().close('b');
		useAIAssistantOpenConversationsStore.getState().prune(['c', 'missing']);

		expect(tabs()).toStrictEqual(['a', 'd']);
	});

	it('saves the tabs as soon as they change', () => {
		openAll(['a', 'b']);

		expect(
			JSON.parse(
				getLocalStorageKey(AI_ASSISTANT_OPEN_CONVERSATIONS_STORAGE_KEY) ?? '{}',
			),
		).toStrictEqual({ state: { threadIds: ['a', 'b'] }, version: 1 });
	});

	it('restores only string ids from storage, newest five', async () => {
		setLocalStorageKey(
			AI_ASSISTANT_OPEN_CONVERSATIONS_STORAGE_KEY,
			JSON.stringify({
				state: { threadIds: ['1', '2', 3, '4', '5', '6', null, '7'] },
				version: 1,
			}),
		);

		await useAIAssistantOpenConversationsStore.persist.rehydrate();

		expect(tabs()).toStrictEqual(['2', '4', '5', '6', '7']);
	});

	it('restores no tabs from a stored value that is not a list', async () => {
		useAIAssistantOpenConversationsStore.setState({ threadIds: ['open'] });
		setLocalStorageKey(
			AI_ASSISTANT_OPEN_CONVERSATIONS_STORAGE_KEY,
			JSON.stringify({ state: { threadIds: 'a' }, version: 1 }),
		);

		await useAIAssistantOpenConversationsStore.persist.rehydrate();

		expect(tabs()).toStrictEqual([]);
	});
});
