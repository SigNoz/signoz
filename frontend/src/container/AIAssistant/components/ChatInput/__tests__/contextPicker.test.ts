import {
	CONTEXT_CATEGORIES,
	getContextPickerEmptyContent,
} from '../contextPicker';

describe('getContextPickerEmptyContent', () => {
	describe('onboarding (no query)', () => {
		it('returns per-category copy and prefix-only prefill for dashboards', () => {
			expect(getContextPickerEmptyContent('Dashboards', '')).toStrictEqual({
				title: 'No dashboards yet.',
				ctaLabel: 'Ask me to create one',
				prefill: 'Create a dashboard for ',
			});
		});

		it('returns per-category copy and prefix-only prefill for alerts', () => {
			expect(getContextPickerEmptyContent('Alerts', '')).toStrictEqual({
				title: 'No alerts yet.',
				ctaLabel: 'Ask me to create one',
				prefill: 'Create an alert for ',
			});
		});

		it('returns instrumentation-flavoured copy for services', () => {
			expect(getContextPickerEmptyContent('Services', '')).toStrictEqual({
				title: 'No services reporting data yet.',
				ctaLabel: 'Ask me to help set up instrumentation',
				prefill: 'Help me set up instrumentation for ',
			});
		});

		it('treats a whitespace-only query as no query', () => {
			expect(getContextPickerEmptyContent('Dashboards', '   ')).toStrictEqual({
				title: 'No dashboards yet.',
				ctaLabel: 'Ask me to create one',
				prefill: 'Create a dashboard for ',
			});
		});

		it('leaves the prefill ending in a space so the caret sits after it', () => {
			CONTEXT_CATEGORIES.forEach((category) => {
				expect(getContextPickerEmptyContent(category, '').prefill).toMatch(/ $/);
			});
		});
	});

	describe('search miss (query, no match)', () => {
		it('seeds the query into dashboards copy and prefill', () => {
			expect(getContextPickerEmptyContent('Dashboards', 'checkout')).toStrictEqual(
				{
					title: 'No dashboards match "checkout".',
					ctaLabel: 'Create a dashboard for "checkout"',
					prefill: 'Create a dashboard for checkout',
				},
			);
		});

		it('seeds the query into alerts copy and prefill', () => {
			expect(getContextPickerEmptyContent('Alerts', 'checkout')).toStrictEqual({
				title: 'No alerts match "checkout".',
				ctaLabel: 'Create an alert for "checkout"',
				prefill: 'Create an alert for checkout',
			});
		});

		it('uses instrumentation wording for services search misses', () => {
			expect(getContextPickerEmptyContent('Services', 'checkout')).toStrictEqual({
				title: 'No services match "checkout".',
				ctaLabel: 'Set up instrumentation for "checkout"',
				prefill: 'Help me set up instrumentation for checkout',
			});
		});

		it('preserves the original casing of the query', () => {
			const { title, ctaLabel, prefill } = getContextPickerEmptyContent(
				'Dashboards',
				'Checkout API',
			);
			expect(title).toBe('No dashboards match "Checkout API".');
			expect(ctaLabel).toBe('Create a dashboard for "Checkout API"');
			expect(prefill).toBe('Create a dashboard for Checkout API');
		});

		it('trims surrounding whitespace from the query', () => {
			expect(
				getContextPickerEmptyContent('Dashboards', '  checkout  ').prefill,
			).toBe('Create a dashboard for checkout');
		});
	});

	it('never emits an em-dash (house style)', () => {
		CONTEXT_CATEGORIES.forEach((category) => {
			const empty = getContextPickerEmptyContent(category, '');
			const miss = getContextPickerEmptyContent(category, 'q');
			[empty, miss].forEach(({ title, ctaLabel, prefill }) => {
				expect(`${title}${ctaLabel}${prefill}`).not.toContain('—');
			});
		});
	});
});
