/**
 * Why a control is unavailable, and how to present it. Carried as one value so
 * a reason cannot be expressed without saying whether it is an access problem
 * or a state the user can act on — absent means the control is available.
 *
 * Use it wherever the reason is optional; where a control always has one, take
 * `reason` and `kind` as separate required props instead.
 */
export interface DisabledState {
	reason: string;
	kind: 'denied' | 'blocked';
}
