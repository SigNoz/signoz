export interface CreatorOption {
	email: string;
	label: string;
}

export type FilterAppliedType = 'createdBy' | 'updatedWindow';

export interface EnumChipOption {
	// null removes the clause, the way Updated's `any` does.
	value: string | null;
	label: string;
}

// A single-select chip over one reserved key with a closed set of values.
export interface EnumChip {
	key: string;
	placeholder: string;
	options: EnumChipOption[];
}

// Analytics payload for a chip change (`valueCount` for Created by).
export type FilterAppliedPayload = Record<string, unknown>;
