import type { EditorProps, Monaco } from '@monaco-editor/react';
import { render } from '@testing-library/react';

import { EDITOR_THEME, registerEditorTheme } from '../editorTheme';
import MonacoEditor from '../MonacoEditor';

const editorProps = jest.fn();

jest.mock('@monaco-editor/react', () => ({
	__esModule: true,
	default: (props: EditorProps): JSX.Element => {
		editorProps(props);
		return <div data-testid="monaco" />;
	},
}));

jest.mock('../editorTheme', () => ({
	EDITOR_THEME: 'signoz',
	registerEditorTheme: jest.fn(),
}));

function lastProps(): EditorProps {
	return editorProps.mock.calls[editorProps.mock.calls.length - 1][0];
}

describe('MonacoEditor', () => {
	beforeEach(() => {
		editorProps.mockClear();
		jest.mocked(registerEditorTheme).mockClear();
	});

	it('renders with the shared theme and forwards the other props', () => {
		render(<MonacoEditor language="json" value="{}" height="100%" />);

		expect(lastProps()).toMatchObject({
			theme: EDITOR_THEME,
			language: 'json',
			value: '{}',
			height: '100%',
		});
	});

	it('registers the theme before the caller sets up monaco', () => {
		const calls: string[] = [];
		jest
			.mocked(registerEditorTheme)
			.mockImplementation(() => calls.push('theme'));
		const beforeMount = jest.fn(() => calls.push('caller'));
		const monaco = {} as Monaco;

		render(<MonacoEditor beforeMount={beforeMount} />);
		lastProps().beforeMount?.(monaco);

		expect(registerEditorTheme).toHaveBeenCalledWith(monaco);
		expect(beforeMount).toHaveBeenCalledWith(monaco);
		expect(calls).toStrictEqual(['theme', 'caller']);
	});
});
