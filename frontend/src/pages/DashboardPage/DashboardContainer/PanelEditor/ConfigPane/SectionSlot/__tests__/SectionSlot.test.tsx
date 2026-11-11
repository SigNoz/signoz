import { useState } from 'react';
import type { DashboardtypesPanelSpecDTO } from 'api/generated/services/sigNoz.schemas';
import {
	type SectionConfig,
	SectionKind,
	ThresholdVariant,
} from 'pages/DashboardPage/DashboardContainer/Panels/types/sections';
import { render, screen, userEvent } from 'tests/test-utils';

import SectionSlot from '../SectionSlot';

const THRESHOLDS_CONFIG: SectionConfig = {
	kind: SectionKind.Thresholds,
	controls: { variant: ThresholdVariant.LABEL },
};

function makeSpec(thresholds: unknown[] = []): DashboardtypesPanelSpecDTO {
	return {
		display: { name: 'CPU' },
		plugin: { kind: 'signoz/TimeSeriesPanel', spec: { thresholds } },
		queries: [],
	} as unknown as DashboardtypesPanelSpecDTO;
}

// Stateful harness so onChange feeds back into the spec (as ConfigPane owns it).
function Harness({ initial = [] }: { initial?: unknown[] } = {}): JSX.Element {
	const [savedSpec] = useState(() => makeSpec(initial));
	const [spec, setSpec] = useState<DashboardtypesPanelSpecDTO>(savedSpec);
	return (
		<SectionSlot
			config={THRESHOLDS_CONFIG}
			spec={spec}
			savedSpec={savedSpec}
			defaults={{}}
			onChangeSpec={setSpec}
		/>
	);
}

describe('SectionSlot header action', () => {
	it('shows the header "+" while the section is collapsed', () => {
		render(<Harness />);

		// Collapsed: body (inline add) hidden, but the header quick-add is available.
		expect(
			screen.queryByTestId('panel-editor-v2-add-threshold'),
		).not.toBeInTheDocument();
		expect(
			screen.getByTestId('panel-editor-v2-add-threshold-header'),
		).toBeInTheDocument();
	});

	it('starts expanded when the section already has items', () => {
		render(
			<Harness initial={[{ value: 80, color: '#F5B225', label: 'High' }]} />,
		);

		// Body is shown on mount (no header click needed) because content exists.
		expect(
			screen.getByTestId('panel-editor-v2-add-threshold'),
		).toBeInTheDocument();
		expect(screen.getByText('High')).toBeInTheDocument();
	});

	it('expands the section and adds a threshold when the header "+" is clicked', async () => {
		const user = userEvent.setup();
		render(<Harness />);

		await user.click(screen.getByTestId('panel-editor-v2-add-threshold-header'));

		// Expanded, with a fresh row opened in edit mode.
		expect(
			screen.getByTestId('panel-editor-v2-add-threshold'),
		).toBeInTheDocument();
		expect(screen.getByTestId('threshold-value-0')).toBeInTheDocument();
	});
});

describe('SectionSlot changed marker', () => {
	it('shows no marker when the section matches the saved spec', () => {
		render(
			<Harness initial={[{ value: 80, color: '#F5B225', label: 'High' }]} />,
		);

		expect(screen.queryByTestId('config-changed-dot')).not.toBeInTheDocument();
	});

	it('marks a section edited since the last save', async () => {
		const user = userEvent.setup();
		render(<Harness />);

		await user.click(screen.getByTestId('panel-editor-v2-add-threshold-header'));

		expect(screen.getByTestId('config-changed-dot')).toBeInTheDocument();
	});

	it('treats an unset saved slice and an explicit empty one as unchanged', () => {
		const savedSpec = {
			display: { name: 'CPU' },
			plugin: { kind: 'signoz/TimeSeriesPanel', spec: {} },
			queries: [],
		} as unknown as DashboardtypesPanelSpecDTO;
		const spec = {
			...savedSpec,
			plugin: {
				kind: 'signoz/TimeSeriesPanel',
				spec: { formatting: { unit: '' } },
			},
		} as unknown as DashboardtypesPanelSpecDTO;

		render(
			<SectionSlot
				config={{ kind: SectionKind.Formatting, controls: { decimals: true } }}
				spec={spec}
				savedSpec={savedSpec}
				defaults={{}}
				onChangeSpec={jest.fn()}
			/>,
		);

		expect(screen.queryByTestId('config-changed-dot')).not.toBeInTheDocument();
	});
});
