import { render, screen } from '@testing-library/react';

import { THRESHOLDS_BY_TYPE } from '../EntityProgressBar.utils';
import { EntityProgressThresholds } from '../EntityProgressThresholds';

describe('EntityProgressThresholds', () => {
	it('renders every threshold band for the given type', () => {
		render(<EntityProgressThresholds type="cpu-limit" />);

		expect(
			screen.getByTestId('entity-progress-thresholds-cpu-limit'),
		).toBeInTheDocument();

		THRESHOLDS_BY_TYPE['cpu-limit'].forEach((threshold) => {
			expect(screen.getByText(threshold.label)).toBeInTheDocument();
			expect(screen.getByText(threshold.range)).toBeInTheDocument();
			expect(screen.getByText(threshold.description)).toBeInTheDocument();
		});
	});

	it('renders the note above the threshold bands when provided', () => {
		render(
			<EntityProgressThresholds type="memory" note="Excluding cache memory." />,
		);

		expect(screen.getByText('Excluding cache memory.')).toBeInTheDocument();
	});
});
