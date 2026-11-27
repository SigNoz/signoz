import { EditorView } from '@uiw/react-codemirror';
import { act, renderHook } from 'tests/test-utils';

import { useEditorDraft } from '../useEditorDraft';

function setup(
	external = '',
	onEdit?: (value: string) => void,
): {
	result: { current: ReturnType<typeof useEditorDraft> };
	rerender: (props: { external: string }) => void;
} {
	return renderHook(
		({ external: value }: { external: string }) => useEditorDraft(value, onEdit),
		{ initialProps: { external } },
	);
}

// Reports document changes to `onChange` the way `@uiw/react-codemirror` does.
function attachEditor(
	result: { current: ReturnType<typeof useEditorDraft> },
	doc: string,
): EditorView {
	const view = new EditorView({
		doc,
		extensions: EditorView.updateListener.of((update) => {
			if (update.docChanged) {
				result.current.editorProps.onChange(update.state.doc.toString());
			}
		}),
	});
	act(() => result.current.editorProps.onCreateEditor(view));
	return view;
}

function type(view: EditorView, text: string): void {
	act(() => {
		view.dispatch({ changes: { from: view.state.doc.length, insert: text } });
	});
}

describe('useEditorDraft', () => {
	it('keeps newer typing when an older edit comes back', () => {
		const { result, rerender } = setup();

		act(() => result.current.editorProps.onChange('count() > 1'));
		act(() => result.current.editorProps.onChange('count() > 10'));
		rerender({ external: 'count() > 1' });

		expect(result.current.draft).toBe('count() > 10');
	});

	it('takes a value set outside the editor', () => {
		const { result, rerender } = setup('count() > 1');

		act(() => result.current.editorProps.onChange('count() > 10'));
		rerender({ external: 'count() > 10' });
		rerender({ external: 'count() < 5' });

		expect(result.current.draft).toBe('count() < 5');
	});

	it('takes an outside value equal to an edit older than the last echo', () => {
		const { result, rerender } = setup();

		act(() => result.current.editorProps.onChange('a'));
		act(() => result.current.editorProps.onChange('ab'));
		rerender({ external: 'ab' });
		rerender({ external: 'a' });

		expect(result.current.draft).toBe('a');
	});

	it('keeps the editor value at the first text while the user types', () => {
		const { result, rerender } = setup('count()');

		act(() => result.current.editorProps.onChange('count() >'));
		rerender({ external: 'count() >' });
		act(() => result.current.editorProps.onChange('count() > 1'));

		expect(result.current.editorProps.value).toBe('count()');
	});

	it('passes each edit on', () => {
		const onEdit = jest.fn();
		const { result } = setup('', onEdit);

		act(() => result.current.editorProps.onChange('count()'));

		expect(onEdit).toHaveBeenCalledWith('count()');
	});

	it('writes an outside change into the editor without passing it on', () => {
		const onEdit = jest.fn();
		const { result, rerender } = setup('count() > 1', onEdit);
		const view = attachEditor(result, 'count() > 1');

		rerender({ external: 'count() < 5' });

		expect(view.state.doc.toString()).toBe('count() < 5');
		expect(view.state.selection.main.head).toBe('count() < 5'.length);
		expect(onEdit).not.toHaveBeenCalled();
	});

	it('leaves the editor alone when an older edit comes back', () => {
		const { result, rerender } = setup();
		const view = attachEditor(result, '');

		type(view, 'count_');
		type(view, 'di');
		rerender({ external: 'count_' });

		expect(view.state.doc.toString()).toBe('count_di');
	});
});
