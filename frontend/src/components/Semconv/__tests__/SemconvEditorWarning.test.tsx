import { render, screen } from 'tests/test-utils';

import SemconvEditorWarning from '../SemconvEditorWarning';

const WARNING_ID = 'semconv-editor-warning';

describe('SemconvEditorWarning', () => {
	it('names the editor and each old name with its current name', () => {
		render(
			<SemconvEditorWarning
				value="SELECT resources_string['deployment.environment'] FROM t"
				editor="ClickHouse SQL"
			/>,
		);

		expect(screen.getByTestId(WARNING_ID)).toHaveTextContent(
			'ClickHouse SQL contains renamed OpenTelemetry fields: deployment.environment → deployment.environment.name',
		);
	});

	it('reads a pipeline filter object', () => {
		render(
			<SemconvEditorWarning
				value={{
					op: 'AND',
					items: [
						{ key: { key: 'deployment.environment' }, op: '=', value: 'prod' },
					],
				}}
				editor="Pipeline filter"
			/>,
		);

		expect(screen.getByTestId(WARNING_ID)).toHaveTextContent(
			'Pipeline filter contains renamed OpenTelemetry fields: deployment.environment → deployment.environment.name',
		);
	});

	it('shows nothing for a current name', () => {
		render(
			<SemconvEditorWarning
				value={'{deployment.environment.name="prod"}'}
				editor="PromQL"
			/>,
		);

		expect(screen.queryByTestId(WARNING_ID)).not.toBeInTheDocument();
	});

	it('shows nothing for an empty editor', () => {
		render(<SemconvEditorWarning value={undefined} editor="PromQL" />);

		expect(screen.queryByTestId(WARNING_ID)).not.toBeInTheDocument();
	});
});
