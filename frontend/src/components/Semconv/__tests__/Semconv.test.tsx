import { render, screen } from '@testing-library/react';

import SemconvEditorWarning from '../SemconvEditorWarning';
import SemconvOldNameBadge from '../SemconvOldNameBadge';

describe('semantic convention product hints', () => {
	it('badges an old raw attribute with its current name', () => {
		render(<SemconvOldNameBadge name="deployment.environment" />);

		expect(screen.getByTestId('semconv-old-name-badge')).toHaveTextContent(
			'old name, renamed to deployment.environment.name',
		);
	});

	it('does not badge a current raw attribute', () => {
		render(<SemconvOldNameBadge name="deployment.environment.name" />);

		expect(
			screen.queryByTestId('semconv-old-name-badge'),
		).not.toBeInTheDocument();
	});

	it('shows an informational editor warning without disabling the editor', () => {
		render(
			<>
				<input aria-label="query" defaultValue="db.system = 'postgresql'" />
				<SemconvEditorWarning
					value="db.system = 'postgresql'"
					editor="ClickHouse SQL"
				/>
			</>,
		);

		expect(screen.getByLabelText('query')).not.toBeDisabled();
		expect(screen.getByTestId('semconv-editor-warning')).toHaveTextContent(
			'db.system → db.system.name',
		);
	});
});
