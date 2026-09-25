import getSessionStorage from 'api/browser/sessionstorage/get';
import removeSessionStorage from 'api/browser/sessionstorage/remove';
import setSessionStorage from 'api/browser/sessionstorage/set';
import type { DashboardtypesPanelSpecDTO } from 'api/generated/services/sigNoz.schemas';
import { SESSIONSTORAGE } from 'constants/sessionStorage';

interface ViewPanelHandoff {
	/** Correlator: the read returns the spec only for this exact dashboard + panel. */
	dashboardId: string;
	panelId: string;
	spec: DashboardtypesPanelSpecDTO;
}

/**
 * Tab-scoped handoff of the editor's un-saved draft spec to the View modal, so "Switch to View
 * Mode" carries config edits — not just the query, which stays in the URL. sessionStorage keeps
 * the link small yet survives a refresh, and clears the edits when the tab closes.
 */
export function writeViewPanelHandoff(handoff: ViewPanelHandoff): void {
	setSessionStorage(SESSIONSTORAGE.VIEW_PANEL_HANDOFF, JSON.stringify(handoff));
}

export function readViewPanelHandoff(
	dashboardId: string,
	panelId: string,
): DashboardtypesPanelSpecDTO | null {
	const raw = getSessionStorage(SESSIONSTORAGE.VIEW_PANEL_HANDOFF);
	if (!raw) {
		return null;
	}
	try {
		const handoff = JSON.parse(raw) as ViewPanelHandoff;
		return handoff.dashboardId === dashboardId && handoff.panelId === panelId
			? handoff.spec
			: null;
	} catch {
		return null;
	}
}

export function clearViewPanelHandoff(): void {
	removeSessionStorage(SESSIONSTORAGE.VIEW_PANEL_HANDOFF);
}
