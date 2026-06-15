import { useCallback, useState } from 'react';

import { DraftMapper, MapperDraft, MapperDraftMode } from './types';
import { EMPTY_MAPPER_DRAFT, mapperDraftFromNode } from './utils';

interface UseMapperFormDrawerResult {
	isOpen: boolean;
	mode: MapperDraftMode;
	draft: MapperDraft;
	setDraft: (next: MapperDraft) => void;
	openForAdd: () => void;
	openForEdit: (mapper: DraftMapper) => void;
	close: () => void;
}

// Form state for the mapper drawer. Persistence is staged through the store,
// so this hook only owns open/draft/mode.
export function useMapperFormDrawer(): UseMapperFormDrawerResult {
	const [isOpen, setIsOpen] = useState<boolean>(false);
	const [mode, setMode] = useState<MapperDraftMode>('add');
	const [draft, setDraft] = useState<MapperDraft>(EMPTY_MAPPER_DRAFT);

	const openForAdd = useCallback((): void => {
		setMode('add');
		setDraft(EMPTY_MAPPER_DRAFT);
		setIsOpen(true);
	}, []);

	const openForEdit = useCallback((mapper: DraftMapper): void => {
		setMode('edit');
		setDraft(mapperDraftFromNode(mapper));
		setIsOpen(true);
	}, []);

	const close = useCallback((): void => {
		setIsOpen(false);
	}, []);

	return { isOpen, mode, draft, setDraft, openForAdd, openForEdit, close };
}
