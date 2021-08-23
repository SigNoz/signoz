import { lazy, ComponentType } from "react";

function Loadable(importPath: {
	(): LoadableProps;
}): React.LazyExoticComponent<LazyComponent> {
	const LazyComponent = lazy(() => importPath());

	return LazyComponent;
}

type LazyComponent = ComponentType<Record<string, unknown>>;

type LoadableProps = Promise<{
	default: LazyComponent;
}>;

export default Loadable;
