import { ComponentType, lazy, LazyExoticComponent } from 'react';
import { lazyRetry } from 'utils/lazyWithRetries';

type LazyComponent = ComponentType<Record<string, unknown>>;

type LoadableProps = Promise<{
	default: LazyComponent;
}>;

function Loadable(importPath: {
	(): LoadableProps;
}): LazyExoticComponent<LazyComponent> {
	return lazy(() => lazyRetry(() => importPath()));
}

export default Loadable;
