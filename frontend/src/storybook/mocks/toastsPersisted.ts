let persisted = true;

/** Set from the Toasts control, through `globals/toastMocks.ts`. */
export const persistToasts = (value: boolean): void => {
	persisted = value;
};

/**
 * Sonner's default is 4s. A toast with no `duration` of its own follows the
 * `Toaster`, so `Infinity` here keeps it on screen for the capture.
 */
export const toastDuration = (): number | undefined =>
	persisted ? Infinity : undefined;

export const areToastsPersisted = (): boolean => persisted;
