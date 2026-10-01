import { render, screen } from 'tests/test-utils';

import { renderOldNameBadge } from '../renderOldNameBadge';

const BADGE_ID = 'semconv-old-name-badge-deployment.environment';

describe('renderOldNameBadge', () => {
	it('badges an old resource attribute with its current name', () => {
		render(<>{renderOldNameBadge(['resource', 'deployment.environment'])}</>);

		expect(screen.getByTestId(BADGE_ID)).toHaveTextContent(
			'old name, renamed to deployment.environment.name',
		);
	});

	it('badges an old name in the attributes map', () => {
		render(<>{renderOldNameBadge(['attributes', 'deployment.environment'])}</>);

		expect(screen.getByTestId(BADGE_ID)).toBeInTheDocument();
	});

	it('returns nothing for a current name', () => {
		expect(
			renderOldNameBadge(['resource', 'deployment.environment.name']),
		).toBeNull();
	});

	it('returns nothing for the same spelling inside a JSON body', () => {
		expect(renderOldNameBadge(['body', 'deployment.environment'])).toBeNull();
	});

	it('returns nothing for a key nested under an old-name attribute', () => {
		expect(
			renderOldNameBadge(['attributes', 'deployment.environment', 'region']),
		).toBeNull();
	});

	it('returns nothing for an old metric name', () => {
		expect(
			renderOldNameBadge(['attributes', 'k8s.pod.cpu.utilization']),
		).toBeNull();
	});
});
