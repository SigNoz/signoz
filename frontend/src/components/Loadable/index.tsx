import { ComponentType, lazy, LazyExoticComponent } from 'react';
import { lazyRetry } from 'utils/lazyWithRetries';

function Loadable(importPath: {
	(): LoadableProps;
}): LazyExoticComponent<LazyComponent> {
	return lazy(() => lazyRetry(() => importPath()));
}

type LazyComponent = ComponentType<Record<string, unknown>>;

type LoadableProps = Promise<{
	default: LazyComponent;
}>;

export default Loadable;
