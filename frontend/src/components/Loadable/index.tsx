import { ComponentType, lazy, LazyExoticComponent } from 'react';

function Loadable(importPath: {
	(): LoadableProps;
}): LazyExoticComponent<LazyComponent> {
	return lazy(() => importPath());
}

type LazyComponent = ComponentType<Record<string, unknown>>;

type LoadableProps = Promise<{
	default: LazyComponent;
}>;

export default Loadable;
