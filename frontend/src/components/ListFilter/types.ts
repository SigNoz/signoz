export interface CreatorOption {
	email: string;
	label: string;
}

export type FilterAppliedType = 'createdBy' | 'updatedWindow';

// Analytics payload for a chip change (`valueCount` for Created by).
export type FilterAppliedPayload = Record<string, unknown>;
