import type { ComponentType } from 'react';
import { Route, Routes } from 'react-router';

/**
 * A page that reads its params out of the pathname renders under its own route
 * rather than being mounted bare. `<Route>` only resolves inside `<Routes>`, so
 * the pattern a story declares is mounted here instead of in each meta.
 */
export const renderAtRoute = (
	path: string | string[],
	Component: ComponentType,
): (() => JSX.Element) => {
	function StoryAtRoute(): JSX.Element {
		return (
			<Routes>
				{(Array.isArray(path) ? path : [path]).map((pattern) => (
					<Route key={pattern} path={pattern} element={<Component />} />
				))}
			</Routes>
		);
	}

	return StoryAtRoute;
};
