import { useCallback, useEffect, useRef, useState } from 'react';
import { QueryParams } from 'constants/query';
import { useIsTextSelected } from 'hooks/useIsTextSelected';
import useUrlQuery from 'hooks/useUrlQuery';

import { AuditLog } from '../AuditLogs.types';

interface UseAuditLogDetailResult {
	activeLog: AuditLog | null;
	handleSetActiveLog: (log: AuditLog) => void;
	handleCloseLogDetail: () => void;
}

export function useAuditLogDetail(): UseAuditLogDetailResult {
	const [activeLog, setActiveLog] = useState<AuditLog | null>(null);
	const isTextSelected = useIsTextSelected();

	const compositeQuery = useUrlQuery().get(QueryParams.compositeQuery) ?? '';
	const prevQueryRef = useRef<string | null>(null);
	useEffect(() => {
		if (
			prevQueryRef.current !== null &&
			prevQueryRef.current !== compositeQuery
		) {
			setActiveLog(null);
		}
		prevQueryRef.current = compositeQuery;
	}, [compositeQuery]);

	const handleSetActiveLog = useCallback(
		(log: AuditLog): void => {
			if (isTextSelected()) {
				return;
			}
			setActiveLog((current) => (current?.id === log.id ? null : log));
		},
		[isTextSelected],
	);

	const handleCloseLogDetail = useCallback((): void => setActiveLog(null), []);

	return { activeLog, handleSetActiveLog, handleCloseLogDetail };
}
