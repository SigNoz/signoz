import type { VirtuosoHandle } from 'react-virtuoso';
import { renderHook } from 'tests/test-utils';

import type { Message } from '../../../types';
import { useScrollToSentMessage } from '../useScrollToSentMessage';

const question: Message = {
	id: 'q-1',
	role: 'user',
	content: 'Why is checkout slow?',
	createdAt: 0,
};
const answer: Message = {
	id: 'a-1',
	role: 'assistant',
	content: 'Its p99 doubled.',
	createdAt: 1,
};
const followUp: Message = {
	id: 'q-2',
	role: 'user',
	content: 'Since when?',
	createdAt: 2,
};

const scrollToIndex = jest.fn() as jest.MockedFunction<
	VirtuosoHandle['scrollToIndex']
>;
const virtuoso: VirtuosoHandle = {
	scrollToIndex,
	scrollIntoView: jest.fn(),
	scrollTo: jest.fn(),
	scrollBy: jest.fn(),
	autoscrollToBottom: jest.fn(),
};

function renderScrollToSent(initial: Message[]): {
	rerender: (messages: Message[]) => void;
} {
	return renderHook(
		(messages: Message[]) =>
			useScrollToSentMessage({ current: virtuoso }, messages),
		{ initialProps: initial },
	);
}

describe('useScrollToSentMessage', () => {
	beforeEach(() => {
		scrollToIndex.mockClear();
	});

	it('brings the end of the thread into view when the user sends', () => {
		const { rerender } = renderScrollToSent([question, answer]);

		rerender([question, answer, followUp]);

		expect(scrollToIndex).toHaveBeenCalledTimes(1);
		expect(scrollToIndex).toHaveBeenCalledWith({ index: 'LAST', align: 'end' });
	});

	it('leaves the view where it is when the reply lands', () => {
		const { rerender } = renderScrollToSent([question]);
		scrollToIndex.mockClear();

		rerender([question, answer]);

		expect(scrollToIndex).not.toHaveBeenCalled();
	});
});
