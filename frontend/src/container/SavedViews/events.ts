export enum SavedViewEvents {
	ViewCreated = 'Saved Views: View created',
	ViewUpdated = 'Saved Views: View updated',
	ViewDetailsEdited = 'Saved Views: View details edited',
	ViewDeleted = 'Saved Views: View deleted',
	LinkCopied = 'Saved Views: Link copied',
	ViewCleared = 'Saved Views: View cleared',
	ChangesDiscarded = 'Saved Views: Changes discarded',
}

export enum SavedViewEventKeys {
	// Injected on every event by useSavedViewLogEvent
	Source = 'source',

	ViewId = 'viewId',
	From = 'from',
}

export enum SavedViewCreatedFrom {
	Header = 'header',
	SaveAsNew = 'save_as_new',
	EmptyState = 'empty_state',
}
