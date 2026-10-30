import type { ComponentType } from 'react';
import { Route } from 'react-router-dom';

/**
 * A page that reads its params out of the pathname renders under its own route
 * rather than being mounted bare. Stories declare the pattern here instead of
 * mounting a router `<Route>` themselves.
 */
export const renderAtRoute = (
	path: string | string[],
	Component: ComponentType,
): (() => JSX.Element) => {
	function StoryAtRoute(): JSX.Element {
		return <Route exact path={path} component={Component} />;
	}

	return StoryAtRoute;
};
