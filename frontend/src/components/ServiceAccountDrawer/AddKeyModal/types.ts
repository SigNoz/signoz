import type { Dayjs } from 'dayjs';

export const enum Phase {
	FORM = 'form',
	CREATED = 'created',
}

export const enum ExpiryMode {
	NONE = 'none',
	DATE = 'date',
}

export const FORM_ID = 'add-key-form';

export const PHASE_TITLES: Record<Phase, string> = {
	[Phase.FORM]: 'Add a New Key',
	[Phase.CREATED]: 'Key Created Successfully',
};

export interface FormValues {
	keyName: string;
	expiryMode: ExpiryMode;
	expiryDate: Dayjs | null;
}

export const DEFAULT_FORM_VALUES: FormValues = {
	keyName: '',
	expiryMode: ExpiryMode.NONE,
	expiryDate: null,
};
