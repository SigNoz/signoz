import { act, renderHook } from 'tests/test-utils';

import { useEditorDraft } from '../useEditorDraft';

function setup(external = ''): {
	result: { current: ReturnType<typeof useEditorDraft> };
	rerender: (props: { external: string }) => void;
} {
	return renderHook(
		({ external: value }: { external: string }) => useEditorDraft(value),
		{ initialProps: { external } },
	);
}

describe('useEditorDraft', () => {
	it('keeps newer typing when an older edit comes back', () => {
		const { result, rerender } = setup();

		act(() => result.current[1]('count() > 1'));
		act(() => result.current[1]('count() > 10'));
		rerender({ external: 'count() > 1' });

		expect(result.current[0]).toBe('count() > 10');
	});

	it('takes a value set outside the editor', () => {
		const { result, rerender } = setup('count() > 1');

		act(() => result.current[1]('count() > 10'));
		rerender({ external: 'count() > 10' });
		rerender({ external: 'count() < 5' });

		expect(result.current[0]).toBe('count() < 5');
	});

	it('takes an outside value equal to an edit older than the last echo', () => {
		const { result, rerender } = setup();

		act(() => result.current[1]('a'));
		act(() => result.current[1]('ab'));
		rerender({ external: 'ab' });
		rerender({ external: 'a' });

		expect(result.current[0]).toBe('a');
	});
});
