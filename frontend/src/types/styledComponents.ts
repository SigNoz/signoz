import type { DefaultTheme, ThemedCssFunction } from 'styled-components';

/** Return type accepted by styled-components interpolations: a `css` block, a plain string, or nothing. */
export type StyledCSS =
	| ReturnType<ThemedCssFunction<DefaultTheme>>
	| string
	| false
	| undefined;
