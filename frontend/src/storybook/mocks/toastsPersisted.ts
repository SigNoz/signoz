let persisted = true;

/** Set from the Toasts control, through `globals/toastMocks.ts`. */
export const persistToasts = (value: boolean): void => {
	persisted = value;
};

/** Whether the Toasts control is holding the stack open. */
export const areToastsPersisted = (): boolean => persisted;
