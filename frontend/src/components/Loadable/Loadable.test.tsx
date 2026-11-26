import React, { ComponentType, Suspense } from 'react';
import { render, screen } from 'tests/test-utils';

import Loadable from './index';

// Sample component to be loaded lazily
function SampleComponent(): JSX.Element {
	return <div data-testid="sample-component">Sample Component</div>;
}

const loadSampleComponent = (): Promise<{
	default: ComponentType;
}> => Promise.resolve({ default: SampleComponent });

describe('Loadable', () => {
	it('should render the lazily loaded component', async () => {
		const LoadableSampleComponent = Loadable(loadSampleComponent);

		render(
			<Suspense fallback={<div data-testid="loading">Loading...</div>}>
				<LoadableSampleComponent />
			</Suspense>,
		);

		expect(screen.getByTestId('loading')).toBeInTheDocument();
		await expect(
			screen.findByTestId('sample-component'),
		).resolves.toHaveTextContent('Sample Component');
		expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
	});

	it('should call lazy with the provided import path', () => {
		const reactLazySpy = jest.spyOn(React, 'lazy');
		Loadable(loadSampleComponent);

		expect(reactLazySpy).toHaveBeenCalledTimes(1);
		expect(reactLazySpy).toHaveBeenCalledWith(expect.any(Function));

		reactLazySpy.mockRestore();
	});
});
