import { useMemo } from 'react';

import { Empty } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import type {
	DashboardtypesLayoutDTO,
	DashboardtypesPanelDTO,
} from 'api/generated/services/sigNoz.schemas';

import { layoutsToSections } from '../utils';
import Section from './Section';

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

interface Props {
	layouts: DashboardtypesLayoutDTO[] | undefined | null;
	panels: Record<string, DashboardtypesPanelDTO | undefined> | undefined;
}

function GridCardLayoutV2({ layouts, panels }: Props): JSX.Element {
	const sections = useMemo(() => layoutsToSections(layouts, panels), [
		layouts,
		panels,
	]);

	const isEmpty = sections.length === 0 || sections.every((s) => s.items.length === 0);

	if (isEmpty) {
		return (
			<div style={{ padding: 48, textAlign: 'center' }}>
				<Empty
					image={Empty.PRESENTED_IMAGE_SIMPLE}
					description={
						<Typography.Text>No panels in this dashboard yet</Typography.Text>
					}
				/>
			</div>
		);
	}

	return (
		<>
			{sections.map((section) => (
				<Section key={section.id} section={section} />
			))}
		</>
	);
}

export default GridCardLayoutV2;
