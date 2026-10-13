import { useMemo } from 'react';
import { useAIAssistantStore } from 'container/AIAssistant/store/useAIAssistantStore';
import { useBottomStrip } from 'container/BottomStrip/useBottomStrip';
import { type StripItem, StripItemKind } from 'container/BottomStrip/types';
import { pluralize } from 'utils/pluralize';

export function useAIAssistantStripInfo(): void {
	const conversations = useAIAssistantStore((state) => state.conversations);

	const count = Object.values(conversations).filter(
		(conversation) => !conversation.archived,
	).length;

	const items = useMemo<StripItem[]>(
		() => [{ kind: StripItemKind.Text, text: pluralize(count, 'conversation') }],
		[count],
	);

	useBottomStrip(items);
}
