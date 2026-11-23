export interface CreatorOption {
	email: string;
	label: string;
}

export type FilterAppliedType = 'createdBy' | 'updatedWindow';

// Analytics payload for a chip change (`valueCount` for Created by).
export type FilterAppliedPayload = Record<string, unknown>;

export interface ExtraFiltersApi {
	draft: string;
	/** Replaces the draft and runs it at once. */
	applyDraft: (next: string) => void;
	/** Replaces the draft without running it. */
	setDraft: (next: string) => void;
}
