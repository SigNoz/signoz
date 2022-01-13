import { ComponentType, lazy } from 'react';

function Loadable(importPath: {
	(): LoadableProps;
}): React.LazyExoticComponent<LazyComponent> {
	return lazy(() => importPath());
}

type LazyComponent = ComponentType<Record<string, unknown>>;

type LoadableProps = Promise<{
	default: LazyComponent;
}>;

export default Loadable;
