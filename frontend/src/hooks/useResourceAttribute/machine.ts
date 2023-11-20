import { createMachine } from 'xstate';

export const ResourceAttributesFilterMachine =
	/** @xstate-layout N4IgpgJg5mDOIC5QBECGsAWAjA9qgThAAQDKYBAxhkQIIB2xAYgJYA2ALmPgHQAqqUANJgAngGIAcgFEAGrwDaABgC6iUAAccsZu2Y46akAA9EATkUB2bgEYAbBYsBWWwA5HAFkW3F7gDQgRRABaU3duFwsXAGZbWwAmF3co01jTAF80-zRMXAJiMkpqeiY2Th5+IVExfQAhVgBXfCVVJBBNbV19QxMEcys7B2c3T28-AOC4xUduKItrSbiEuNMo6zcMrPRsPEJScnwqWgYiFg4uPgFhcQAlKRIpBRVDdp09A1aevpt7J1cPLx8-kCCCCcUcURmcwWSxWa0cGxA2W2eT2hSOJTOPAA8uouKh2Dh8JJZI8WhotK8uh9EPM4tYZl4IrZHNY1rZrEDgqFwpEoi43HEnMt3NYEUjcrsCgcisdTmVuDi8QSibUGk0nq0Xp13qAerT6VFGRZmayXOzOSDJtNZrT3I44t5bHaLGKthL8vtDsUTqVzor8PjCWJbvdSc8KdrujTFgajSa2RzxpbwZDbfbHc7XTkdh60d65ecKgA1VANMDVOh1RrNcMdN6GYFBayOKw2xZ2h1eZ3+PX2+mxFzWEWmFymBxRLPIyWemUY+XF0v1cshh41zUR+vUhDNuncAdD6wjscWKIW0FTVPt9NdluT92o6Xon2Y7gASQgrHL0jka-JdapuqIPEcTcIoihxHyTh2Pa-JntyETRO4ngig6yTuBkmQgHQOAQHAhjijmD5erKvr4LWlI6sYiDJIo3Aiieh7Gk4UynkmQRRJ44TARYijJC4AJRBOmEESiUrEXOhaXKI5GRluPG0SkI7uIKhr2vaZ7Nq2cxrGByQWKYpiisJbqEWJs7PvK-qBmR67-pReq6aB1g+DEkEcaYcQaS2l7gTCqzrMZ2aiTOT4FuUAglmWMmboB258hCESmNeLgQR4jheVp8y+SlsIBZsQXTnmJEvu+n7RQBVEIEkLh0dYDFjvYjgsRlqY6bxY4GUZGRAA */
	createMachine({
		tsTypes: {} as import('./machine.typegen').Typegen0,
		initial: 'Idle',
		states: {
			TagKey: {
				on: {
					NEXT: {
						actions: 'onSelectOperator',
						target: 'Operator',
					},
					onBlur: {
						actions: 'onBlurPurge',
						target: 'Idle',
					},
					RESET: {
						target: 'Idle',
					},
				},
			},
			Operator: {
				on: {
					NEXT: {
						actions: 'onSelectTagValue',
						target: 'TagValue',
					},
					onBlur: {
						actions: 'onBlurPurge',
						target: 'Idle',
					},
					RESET: {
						target: 'Idle',
					},
				},
			},
			TagValue: {
				on: {
					onBlur: {
						actions: ['onValidateQuery', 'onBlurPurge'],
						target: 'Idle',
					},
					RESET: {
						target: 'Idle',
					},
				},
			},
			Idle: {
				on: {
					NEXT: {
						actions: 'onSelectTagKey',
						description: 'Select Category',
						target: 'TagKey',
					},
				},
			},
		},
		id: 'ResourceAttributesFilterMachine',
	});
