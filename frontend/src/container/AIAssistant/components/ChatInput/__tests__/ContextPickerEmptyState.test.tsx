import { render, screen, userEvent } from 'tests/test-utils';

import { ContextCategory } from '../contextPicker';
import ContextPickerEmptyState from '../ContextPickerEmptyState';

function renderEmptyState(
	category: ContextCategory,
	query: string,
	onPrefill = jest.fn(),
): { onPrefill: jest.Mock; container: HTMLElement } {
	const { container } = render(
		<ContextPickerEmptyState
			category={category}
			query={query}
			onPrefill={onPrefill}
		/>,
	);
	return { onPrefill, container };
}

function ctaFor(category: ContextCategory): HTMLElement {
	return screen.getByTestId(`ai-context-empty-cta-${category}`);
}

describe('ContextPickerEmptyState', () => {
	describe('onboarding (no query)', () => {
		it('renders dashboards copy and prefills the prefix only', async () => {
			const { onPrefill } = renderEmptyState('Dashboards', '');

			expect(screen.getByText('No dashboards yet.')).toBeInTheDocument();
			const cta = ctaFor('Dashboards');
			expect(cta).toHaveTextContent('Ask me to create one');

			await userEvent.click(cta);
			expect(onPrefill).toHaveBeenCalledTimes(1);
			expect(onPrefill).toHaveBeenCalledWith('Create a dashboard for ');
		});

		it('renders alerts copy and prefills the prefix only', async () => {
			const { onPrefill } = renderEmptyState('Alerts', '');

			expect(screen.getByText('No alerts yet.')).toBeInTheDocument();
			expect(ctaFor('Alerts')).toHaveTextContent('Ask me to create one');

			await userEvent.click(ctaFor('Alerts'));
			expect(onPrefill).toHaveBeenCalledWith('Create an alert for ');
		});

		it('renders instrumentation-flavoured services copy and prefill', async () => {
			const { onPrefill } = renderEmptyState('Services', '');

			expect(
				screen.getByText('No services reporting data yet.'),
			).toBeInTheDocument();
			expect(ctaFor('Services')).toHaveTextContent(
				'Ask me to help set up instrumentation',
			);

			await userEvent.click(ctaFor('Services'));
			expect(onPrefill).toHaveBeenCalledWith(
				'Help me set up instrumentation for ',
			);
		});

		it('treats a whitespace-only query as onboarding', () => {
			renderEmptyState('Dashboards', '   ');
			expect(screen.getByText('No dashboards yet.')).toBeInTheDocument();
		});
	});

	describe('search miss (query, no match)', () => {
		it('seeds the query into dashboards copy and prefill', async () => {
			const { onPrefill } = renderEmptyState('Dashboards', 'checkout');

			expect(
				screen.getByText('No dashboards match "checkout".'),
			).toBeInTheDocument();
			expect(ctaFor('Dashboards')).toHaveTextContent(
				'Create a dashboard for "checkout"',
			);

			await userEvent.click(ctaFor('Dashboards'));
			expect(onPrefill).toHaveBeenCalledWith('Create a dashboard for checkout');
		});

		it('seeds the query into alerts copy and prefill', async () => {
			const { onPrefill } = renderEmptyState('Alerts', 'checkout');

			expect(screen.getByText('No alerts match "checkout".')).toBeInTheDocument();
			await userEvent.click(ctaFor('Alerts'));
			expect(onPrefill).toHaveBeenCalledWith('Create an alert for checkout');
		});

		it('uses instrumentation wording for services search misses', async () => {
			const { onPrefill } = renderEmptyState('Services', 'checkout');

			expect(
				screen.getByText('No services match "checkout".'),
			).toBeInTheDocument();
			await userEvent.click(ctaFor('Services'));
			expect(onPrefill).toHaveBeenCalledWith(
				'Help me set up instrumentation for checkout',
			);
		});

		it('preserves the original casing of the query in copy and prefill', async () => {
			const { onPrefill } = renderEmptyState('Dashboards', 'Checkout API');

			expect(
				screen.getByText('No dashboards match "Checkout API".'),
			).toBeInTheDocument();
			await userEvent.click(ctaFor('Dashboards'));
			expect(onPrefill).toHaveBeenCalledWith(
				'Create a dashboard for Checkout API',
			);
		});
	});

	describe('per-category accent token', () => {
		it.each<[ContextCategory, string]>([
			['Dashboards', 'var(--accent-primary)'],
			['Alerts', 'var(--accent-cherry)'],
			['Services', 'var(--accent-forest)'],
		])('maps %s to the semantic accent %s', (category, accent) => {
			const { container } = renderEmptyState(category, '');
			const root = container.firstChild as HTMLElement;
			expect(root.style.getPropertyValue('--empty-accent')).toBe(accent);
		});
	});

	it('does not auto-send: nothing fires until the CTA is clicked', () => {
		const { onPrefill } = renderEmptyState('Dashboards', 'checkout');
		expect(onPrefill).not.toHaveBeenCalled();
	});
});
