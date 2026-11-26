import { useState } from 'react';
import { tags } from '@lezer/highlight';
import { copilotDarkStyle } from '@uiw/codemirror-theme-copilot';
import { githubLightStyle } from '@uiw/codemirror-theme-github';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { act, render, screen } from 'tests/test-utils';

import SavedViewHighlightedExpression from '../SavedViewHighlightedExpression';

jest.mock('hooks/useDarkMode', () => ({
	useIsDarkMode: jest.fn(),
}));

const mockUseIsDarkMode = useIsDarkMode as jest.MockedFunction<
	typeof useIsDarkMode
>;

const EXPRESSION = "service.name = 'frontend'";

function stringColor(styles: typeof copilotDarkStyle): string {
	return (styles ?? []).find(({ tag }) =>
		(Array.isArray(tag) ? tag : [tag]).includes(tags.string),
	)?.color as string;
}

describe('SavedViewHighlightedExpression', () => {
	it.each([
		['dark', true, copilotDarkStyle],
		['light', false, githubLightStyle],
	])('colours a string value with the %s theme', (_, isDarkMode, styles) => {
		mockUseIsDarkMode.mockReturnValue(isDarkMode);

		render(<SavedViewHighlightedExpression expression={EXPRESSION} />);

		expect(screen.getByText("'frontend'")).toHaveStyle({
			color: stringColor(styles),
		});
	});

	it('takes the new theme colours when the theme changes', () => {
		let setIsDarkMode: (isDarkMode: boolean) => void = () => {};
		function useSwitchableDarkMode(): boolean {
			const [isDarkMode, setter] = useState(true);
			setIsDarkMode = setter;
			return isDarkMode;
		}
		mockUseIsDarkMode.mockImplementation(useSwitchableDarkMode);
		render(<SavedViewHighlightedExpression expression={EXPRESSION} />);

		act(() => setIsDarkMode(false));

		expect(screen.getByText("'frontend'")).toHaveStyle({
			color: stringColor(githubLightStyle),
		});
	});
});
