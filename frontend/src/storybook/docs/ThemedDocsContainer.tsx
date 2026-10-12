import { useEffect } from 'react';
import type { PropsWithChildren } from 'react';
import {
	DocsContainer,
	type DocsContainerProps,
} from '@storybook/addon-docs/blocks';
import { themes } from 'storybook/theming';

import { applyThemeBodyClass } from '../providers/applyThemeBodyClass';

import styles from './themedDocsContainer.module.scss';
import { useDocsTheme } from './useDocsTheme';

/**
 * The container for every docs page, `Docs/*` and autodocs alike.
 *
 * It carries the two things a docs page needs and a story does not, which is why
 * they live here rather than in the preview decorator:
 *
 * - Storybook's own container is always on its light theme, so a docs page came
 *   out white inside a dark app. The body classes go on for the same reason: the
 *   docs page renders in the story iframe, where `styles.scss` paints `body` from
 *   `--l1-background`, and those variables only resolve under a theme class.
 * - That same stylesheet pins `html` and `body` to the viewport with
 *   `overflow: hidden` so `AppLayout` can lay a page out inside it, which leaves
 *   anything below the fold of a docs page unreachable. Lifting it for a story
 *   too would let a page scroll the iframe instead of its own panes, so the class
 *   goes on only while a docs page is mounted.
 */
function ThemedDocsContainer({
	context,
	children,
}: PropsWithChildren<DocsContainerProps>): JSX.Element {
	const theme = useDocsTheme();

	useEffect(() => {
		applyThemeBodyClass(theme);
	}, [theme]);

	useEffect(() => {
		const root = document.documentElement;

		root.classList.add(styles.scrollable);

		return (): void => {
			root.classList.remove(styles.scrollable);
		};
	}, []);

	return (
		<DocsContainer
			context={context}
			theme={theme === 'dark' ? themes.dark : themes.light}
		>
			{children}
		</DocsContainer>
	);
}

export default ThemedDocsContainer;
