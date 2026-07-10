import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from '@signozhq/ui/sonner';
import { updateDashboardV2 } from 'api/generated/services/dashboard';
import type {
	DashboardtypesDashboardSpecDTO,
	DashboardtypesGettableDashboardV2DTO,
} from 'api/generated/services/sigNoz.schemas';
import { useErrorModal } from 'providers/ErrorModalProvider';
import { toAPIError } from 'utils/errorUtils';

import { dashboardToUpdatable } from './dashboardToUpdatable';
import { findPanelLayoutIssues } from './danglingPanels';
import { useDashboardStore } from '../../store/useDashboardStore';

export interface JsonValidity {
	valid: boolean;
	lineCount: number;
	/** 1-based line of the parse error, when known. */
	errorLine?: number;
	message?: string;
}

interface Params {
	dashboard: DashboardtypesGettableDashboardV2DTO;
	isOpen: boolean;
	/** Locked/no-permission — `apply` is a no-op so edits can never be saved. */
	readOnly?: boolean;
	onApplied: () => void;
}

interface Result {
	draft: string;
	setDraft: (next: string) => void;
	validity: JsonValidity;
	isDirty: boolean;
	isSaving: boolean;
	// Panel ids in the draft's `spec.panels` referenced by no layout — orphaned.
	danglingPanelIds: string[];
	// Panel ids a layout references that are missing from the draft's `spec.panels`.
	missingPanelRefs: string[];
	format: () => void;
	reset: () => void;
	apply: () => Promise<void>;
}

/**
 * The editable, user-facing view: only `tags` and `spec`. Everything else
 * (id, orgId, name, timestamps, locked, schemaVersion, image, …) is redacted so it
 * can't be seen, copied, exported or edited; those keys are preserved on save (see `apply`).
 */
const redact = (
	dashboard: DashboardtypesGettableDashboardV2DTO,
): Pick<DashboardtypesGettableDashboardV2DTO, 'tags' | 'spec'> => ({
	tags: dashboard.tags,
	spec: dashboard.spec,
});

const serialize = (dashboard: DashboardtypesGettableDashboardV2DTO): string =>
	JSON.stringify(redact(dashboard), null, 2);

/** Derive a 1-based line number from a `JSON.parse` "position N" error message. */
function errorLineFromMessage(
	source: string,
	message: string,
): number | undefined {
	const match = /position (\d+)/.exec(message);
	if (!match) {
		return undefined;
	}
	const position = Number(match[1]);
	return source.slice(0, position).split('\n').length;
}

/**
 * Editor state for the dashboard JSON drawer: tracks the editable `draft`
 * against the last-applied text, exposes live validation, and applies changes
 * via the full-document update endpoint.
 */
export function useJsonEditor({
	dashboard,
	isOpen,
	readOnly = false,
	onApplied,
}: Params): Result {
	const dashboardId = useDashboardStore((s) => s.dashboardId);
	const refetch = useDashboardStore((s) => s.refetch);
	const { showErrorModal } = useErrorModal();

	const [appliedText, setAppliedText] = useState<string>(() =>
		serialize(dashboard),
	);
	const [draft, setDraft] = useState<string>(appliedText);
	const [isSaving, setIsSaving] = useState(false);

	// Re-seed the editor from the current dashboard each time the drawer opens so
	// it always reflects the latest persisted state (e.g. after a refetch).
	useEffect(() => {
		if (isOpen) {
			const next = serialize(dashboard);
			setAppliedText(next);
			setDraft(next);
		}
	}, [isOpen, dashboard]);

	const validity = useMemo<JsonValidity>(() => {
		const lineCount = draft.split('\n').length;
		try {
			JSON.parse(draft);
			return { valid: true, lineCount };
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Invalid JSON';
			return {
				valid: false,
				lineCount,
				errorLine: errorLineFromMessage(draft, message),
				message,
			};
		}
	}, [draft]);

	const isDirty = draft !== appliedText;

	const { danglingPanelIds, missingPanelRefs } = useMemo<{
		danglingPanelIds: string[];
		missingPanelRefs: string[];
	}>(() => {
		if (!validity.valid) {
			return { danglingPanelIds: [], missingPanelRefs: [] };
		}
		try {
			const parsed = JSON.parse(draft) as {
				spec?: DashboardtypesDashboardSpecDTO;
			};
			return findPanelLayoutIssues(parsed.spec);
		} catch {
			return { danglingPanelIds: [], missingPanelRefs: [] };
		}
	}, [draft, validity.valid]);

	const format = useCallback((): void => {
		try {
			setDraft(JSON.stringify(JSON.parse(draft), null, 2));
		} catch {
			// Leave the draft untouched when it can't be parsed.
		}
	}, [draft]);

	const reset = useCallback((): void => {
		setDraft(appliedText);
	}, [appliedText]);

	const apply = useCallback(async (): Promise<void> => {
		if (readOnly || !validity.valid || !isDirty) {
			return;
		}
		try {
			setIsSaving(true);
			// The draft only carries name/tags/spec; overlay it on the current dashboard
			// so the redacted fields (schemaVersion, image, …) are preserved on save.
			const edited = JSON.parse(draft) as Record<string, unknown>;
			await updateDashboardV2(
				{ id: dashboardId },
				dashboardToUpdatable({ ...dashboard, ...edited }),
			);
			toast.success('Dashboard updated');
			refetch();
			onApplied();
		} catch (error) {
			showErrorModal(toAPIError(error as Parameters<typeof toAPIError>[0]));
		} finally {
			setIsSaving(false);
		}
	}, [
		dashboard,
		dashboardId,
		validity.valid,
		isDirty,
		draft,
		readOnly,
		refetch,
		onApplied,
		showErrorModal,
	]);

	return {
		draft,
		setDraft,
		validity,
		isDirty,
		isSaving,
		danglingPanelIds,
		missingPanelRefs,
		format,
		reset,
		apply,
	};
}
