import { renderHook } from '@testing-library/react';
import useGetResolvedText from 'hooks/dashboard/useGetResolvedText';

describe('useGetResolvedText', () => {
	it('returns the text unchanged when it fits within maxLength', () => {
		const { result } = renderHook(() =>
			useGetResolvedText({ text: 'Logs count', maxLength: 100 }),
		);

		expect(result.current.fullText).toBe('Logs count');
		expect(result.current.truncatedText).toBe('Logs count');
	});

	it('returns the text unchanged when no maxLength is given', () => {
		const text = 'a'.repeat(200);
		const { result } = renderHook(() => useGetResolvedText({ text }));

		expect(result.current.truncatedText).toBe(text);
	});

	it('truncates to maxLength with an ellipsis and keeps the full text', () => {
		const { result } = renderHook(() =>
			useGetResolvedText({ text: 'Logs count in production', maxLength: 20 }),
		);

		expect(result.current.truncatedText).toBe('Logs count in pro...');
		expect(result.current.truncatedText).toHaveLength(20);
		expect(result.current.fullText).toBe('Logs count in production');
	});

	it('passes non-string content through untouched', () => {
		const node = <span>title</span>;
		const { result } = renderHook(() =>
			useGetResolvedText({ text: node, maxLength: 2 }),
		);

		expect(result.current.fullText).toBe(node);
		expect(result.current.truncatedText).toBe(node);
	});
});
