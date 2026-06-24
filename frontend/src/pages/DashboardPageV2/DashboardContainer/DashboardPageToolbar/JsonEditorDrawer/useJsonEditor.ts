import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from '@signozhq/ui/sonner';
import { updateDashboardV2 } from 'api/generated/services/dashboard';
import type { DashboardtypesGettableDashboardV2DTO } from 'api/generated/services/sigNoz.schemas';
import { useErrorModal } from 'providers/ErrorModalProvider';
import APIError from 'types/api/error';

import { dashboardToUpdatable } from './dashboardToUpdatable';
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
	onApplied: () => void;
}

interface Result {
	draft: string;
	setDraft: (next: string) => void;
	validity: JsonValidity;
	isDirty: boolean;
	isSaving: boolean;
	format: () => void;
	reset: () => void;
	apply: () => Promise<void>;
}

const serialize = (dashboard: DashboardtypesGettableDashboardV2DTO): string =>
	JSON.stringify(dashboard, null, 2);

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
		if (!validity.valid || !isDirty) {
			return;
		}
		try {
			setIsSaving(true);
			const parsed = JSON.parse(draft) as Record<string, unknown>;
			await updateDashboardV2({ id: dashboardId }, dashboardToUpdatable(parsed));
			toast.success('Dashboard updated');
			refetch();
			onApplied();
		} catch (error) {
			showErrorModal(error as APIError);
		} finally {
			setIsSaving(false);
		}
	}, [
		dashboardId,
		validity.valid,
		isDirty,
		draft,
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
		format,
		reset,
		apply,
	};
}
