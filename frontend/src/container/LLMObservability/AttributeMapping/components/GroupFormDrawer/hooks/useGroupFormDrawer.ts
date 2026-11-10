import { useCallback, useState } from 'react';

import { DraftGroup, GroupDraft, MapperDraftMode } from '../../../types';
import { EMPTY_GROUP_DRAFT, groupDraftFromNode } from '../../../utils';

interface UseGroupFormDrawer {
	isOpen: boolean;
	mode: MapperDraftMode;
	draft: GroupDraft;
	setDraft: (next: GroupDraft) => void;
	openForAdd: () => void;
	openForEdit: (group: DraftGroup) => void;
	close: () => void;
}

export function useGroupFormDrawer(): UseGroupFormDrawer {
	const [isOpen, setIsOpen] = useState<boolean>(false);
	const [mode, setMode] = useState<MapperDraftMode>('add');
	const [draft, setDraft] = useState<GroupDraft>(EMPTY_GROUP_DRAFT);

	const openForAdd = useCallback((): void => {
		setMode('add');
		setDraft(EMPTY_GROUP_DRAFT);
		setIsOpen(true);
	}, []);

	const openForEdit = useCallback((group: DraftGroup): void => {
		setMode('edit');
		setDraft(groupDraftFromNode(group));
		setIsOpen(true);
	}, []);

	const close = useCallback((): void => {
		setIsOpen(false);
	}, []);

	return { isOpen, mode, draft, setDraft, openForAdd, openForEdit, close };
}
