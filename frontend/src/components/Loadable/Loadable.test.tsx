import {
	render,
	screen,
	waitForElementToBeRemoved,
} from '@testing-library/react';
import React from 'react';

import Loadable from './index';

// Sample component to be loaded lazily
function SampleComponent(): JSX.Element {
	return <div>Sample Component</div>;
}

const loadSampleComponent = (): Promise<{
	default: React.ComponentType;
}> =>
	new Promise<{ default: React.ComponentType }>((resolve) => {
		setTimeout(() => {
			resolve({ default: SampleComponent });
		}, 500);
	});

describe('Loadable', () => {
	it('should render the lazily loaded component', async () => {
		const LoadableSampleComponent = Loadable(loadSampleComponent);

		const { container } = render(
			<React.Suspense fallback={<div>Loading...</div>}>
				<LoadableSampleComponent />
			</React.Suspense>,
		);

		expect(screen.getByText('Loading...')).toBeInTheDocument();
		await waitForElementToBeRemoved(() => screen.queryByText('Loading...'));

		expect(container.querySelector('div')).toHaveTextContent('Sample Component');
	});

	it('should call React.lazy with the provided import path', () => {
		const reactLazySpy = jest.spyOn(React, 'lazy');
		Loadable(loadSampleComponent);

		expect(reactLazySpy).toHaveBeenCalledTimes(1);
		expect(reactLazySpy).toHaveBeenCalledWith(expect.any(Function));

		reactLazySpy.mockRestore();
	});
});
