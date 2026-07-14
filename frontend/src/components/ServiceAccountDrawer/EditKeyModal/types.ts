import type { Dayjs } from 'dayjs';

export const enum ExpiryMode {
	NONE = 'none',
	DATE = 'date',
}

export const FORM_ID = 'edit-key-form';

export interface FormValues {
	name: string;
	expiryMode: ExpiryMode;
	expiresAt: Dayjs | null;
}

export const DEFAULT_FORM_VALUES: FormValues = {
	name: '',
	expiryMode: ExpiryMode.NONE,
	expiresAt: null,
};
