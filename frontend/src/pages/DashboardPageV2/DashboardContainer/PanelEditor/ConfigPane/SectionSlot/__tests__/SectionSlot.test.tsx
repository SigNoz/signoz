import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { DashboardtypesPanelSpecDTO } from 'api/generated/services/sigNoz.schemas';
import {
	type SectionConfig,
	SectionKind,
	ThresholdVariant,
} from 'pages/DashboardPageV2/DashboardContainer/Panels/types/sections';

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
	const [spec, setSpec] = useState<DashboardtypesPanelSpecDTO>(
		makeSpec(initial),
	);
	return (
		<SectionSlot config={THRESHOLDS_CONFIG} spec={spec} onChangeSpec={setSpec} />
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

	it('expands the section and adds a threshold when the header "+" is clicked', () => {
		render(<Harness />);

		fireEvent.click(screen.getByTestId('panel-editor-v2-add-threshold-header'));

		// Expanded, with a fresh row opened in edit mode.
		expect(
			screen.getByTestId('panel-editor-v2-add-threshold'),
		).toBeInTheDocument();
		expect(screen.getByTestId('threshold-value-0')).toBeInTheDocument();
	});
});
