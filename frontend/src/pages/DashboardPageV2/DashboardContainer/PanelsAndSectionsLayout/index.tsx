import { ReactNode, useMemo } from 'react';

import type {
	DashboardtypesLayoutDTO,
	DashboardtypesPanelDTO,
} from 'api/generated/services/sigNoz.schemas';

import { useDashboardStore } from '../store/useDashboardStore';
import { layoutsToSections } from '../utils';
import DashboardEmptyState from './DashboardEmptyState/DashboardEmptyState';
import { useViewPanel } from './Panel/hooks/useViewPanel';
import ViewPanelModal from './Panel/ViewPanelModal/ViewPanelModal';
import Section from './Section/Section/Section';
import SectionList from './Section/SectionList';
import styles from './PanelsAndSectionsLayout.module.scss';

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

interface PanelsAndSectionsLayoutProps {
	layouts: DashboardtypesLayoutDTO[];
	panels: Record<string, DashboardtypesPanelDTO | undefined>;
}

function PanelsAndSectionsLayout({
	layouts,
	panels,
}: PanelsAndSectionsLayoutProps): JSX.Element {
	const isEditable = useDashboardStore((s) => s.isEditable);

	// Single View-modal host for the whole dashboard, driven by the URL
	// (`expandedWidgetId`). One mounted modal beats one-per-panel: no N location
	// subscriptions, and the expanded panel is looked up by id from the map. A
	// drilldown refinement rides in the URL (`compositeQuery`/`graphType`) and is
	// hydrated inside the modal, so the host just hands it the saved panel.
	const { expandedPanelId, closeView } = useViewPanel();
	const expandedPanel = expandedPanelId ? panels[expandedPanelId] : undefined;

	const sections = useMemo(
		() => layoutsToSections(layouts, panels),
		[layouts, panels],
	);

	// Sectioned mode = at least one titled layout. Sections then become a
	// reorderable list; otherwise the dashboard is a single free-flowing grid
	// with no section chrome or reordering.
	const isSectioned = useMemo(() => sections.some((s) => !!s.title), [sections]);

	// A titled section renders even with no panels (its header + add-panel state);
	// only show the dashboard empty state when nothing is titled and there are no panels.
	const isEmpty =
		sections.length === 0 ||
		(!isSectioned && sections.every((s) => s.items.length === 0));

	const renderContent = (): ReactNode => {
		if (isEmpty) {
			return <DashboardEmptyState canAddPanel={isEditable} />;
		}

		if (isSectioned) {
			return <SectionList sections={sections} layouts={layouts} />;
		}

		// Free-flow (no titled sections): panels still get the layout context so
		// the menu's delete action can patch the section's items (previously a
		// silent noop in this mode).
		return sections.map((section) => (
			<Section key={section.id} section={section} sections={sections} />
		));
	};

	return (
		<div className={styles.body}>
			{renderContent()}
			<ViewPanelModal
				open={!!expandedPanel}
				panel={expandedPanel}
				panelId={expandedPanelId ?? undefined}
				onClose={closeView}
			/>
		</div>
	);
}

export default PanelsAndSectionsLayout;
