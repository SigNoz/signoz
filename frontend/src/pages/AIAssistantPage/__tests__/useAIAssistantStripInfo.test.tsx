import { renderHook } from '@testing-library/react';
import { useAIAssistantStore } from 'container/AIAssistant/store/useAIAssistantStore';
import { useBottomStripStore } from 'container/BottomStrip/store/useBottomStripStore';
import { StripItemKind } from 'container/BottomStrip/types';

import { useAIAssistantStripInfo } from '../useAIAssistantStripInfo';

function seed(conversations: Record<string, unknown>): void {
	useAIAssistantStore.setState({ conversations } as never);
}

describe('useAIAssistantStripInfo', () => {
	beforeEach(() => {
		useBottomStripStore.setState({ left: null, ownerId: null });
	});

	it('counts only the conversations that are not archived', () => {
		seed({
			a: { id: 'a' },
			b: { id: 'b' },
			c: { id: 'c', archived: true },
		});

		renderHook(() => useAIAssistantStripInfo());

		expect(useBottomStripStore.getState().left).toMatchObject([
			{ kind: StripItemKind.Text, text: '2 conversations' },
		]);
	});

	it('says one conversation, not 1 conversations', () => {
		seed({ a: { id: 'a' } });

		renderHook(() => useAIAssistantStripInfo());

		expect(useBottomStripStore.getState().left?.[0]).toMatchObject({
			text: '1 conversation',
		});
	});

	it('shows zero when there are none', () => {
		seed({});

		renderHook(() => useAIAssistantStripInfo());

		expect(useBottomStripStore.getState().left?.[0]).toMatchObject({
			text: '0 conversations',
		});
	});

	it('clears the strip when the page unmounts', () => {
		seed({ a: { id: 'a' } });

		const { unmount } = renderHook(() => useAIAssistantStripInfo());

		unmount();

		expect(useBottomStripStore.getState().left).toBeNull();
	});
});
