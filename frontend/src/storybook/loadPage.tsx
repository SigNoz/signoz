import type { ComponentType } from 'react';
import type { Loader, StoryContext } from '@storybook/react-vite';

import { renderAtRoute } from './renderAtRoute';

interface PageModule {
	default: ComponentType;
}

/**
 * Imports a page when its story renders instead of when the story file loads.
 * A file that mounts many pages compiles one of them per story rather than all
 * of them in the first, which is what outlasts the runner's timeout on a cold
 * dev server.
 */
export const loadPage =
	(load: () => Promise<PageModule>): Loader =>
	async (): Promise<{ Page: ComponentType }> => ({
		Page: (await load()).default,
	});

export const renderLoadedPage = (
	_args: unknown,
	{ loaded }: StoryContext,
): JSX.Element => {
	const Page = loaded.Page as ComponentType;

	return <Page />;
};

export const renderLoadedPageAtRoute =
	(path: string | string[]) =>
	(_args: unknown, { loaded }: StoryContext): JSX.Element =>
		renderAtRoute(path, loaded.Page as ComponentType)();
