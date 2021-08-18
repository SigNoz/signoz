import React, { lazy, ComponentType } from "react";

function Loadable<T>(importPath: {
	(): LoadableProps;
}): (props: T) => JSX.Element {
	const LazyComponent = lazy(() => importPath());

	return () => <LazyComponent />;
}

type LoadableProps = Promise<{
	default: ComponentType<Record<string, unknown>>;
}>;

export default Loadable;
