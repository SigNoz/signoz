import { render, screen } from '@testing-library/react';

import {
	AlertThresholdMatchType,
	AlertThresholdOperator,
} from '../../context/types';
import { getMatchTypeTooltip } from '../utils';

const DOCS_URL =
	'https://signoz.io/docs/alerts-management/user-guides/understanding-alert-evaluation-patterns/';

describe('getMatchTypeTooltip', () => {
	it.each(Object.values(AlertThresholdMatchType))(
		'links "Learn more" to the alert evaluation patterns docs for %s',
		(matchType) => {
			render(
				<div>
					{getMatchTypeTooltip(matchType, AlertThresholdOperator.IS_ABOVE)}
				</div>,
			);

			const link = screen.getByRole('link', { name: 'Learn more' });
			expect(link).toHaveAttribute('href', DOCS_URL);
			expect(link).toHaveAttribute('target', '_blank');
		},
	);
});
