import { createMachine } from 'xstate';

export const DashboardSearchAndFilter =
	/** @xstate-layout N4IgpgJg5mDOIC5QBECGsAWAjA9qgThAAQDKYBAxhkQIIB2xAYgJYA2ALmPgHQDCqnKDnwBPAMQA5AKIANACqJQABxyxm7ZjjqKQAD0QAmAOwHuADgCsABiMBGK1YsWALBYDMBgDQgRiALSu3B4AnM62do7ORg62zgC+cd5omLgExGSU1PRMbJw8-ILC4loAQqwArvg6KmoaWjr6CH5uRm7cBhZmbs7OAGxGRs5mwV4+-uHB3EMWvS3Bbm7Btm5W8Ykgydh4hKTk+FS0DEQsHFzcAPJKXALCkrIKSCA16praj40Gvc7t0f2uszYht5fAgzFZzFFnAYrPM3GZbAZgkYEkl0Fs0rtMoccqceJdruxbqUKlVHs86m9QI1mq12p1ulYPL0EQtgf4OhCWs5HCNur1YSiNmjUjsMvsskcTnluAA1VAVMBiYmVaqqF71d7+OHfNxfWJmIy9XqrL5GNkIWKmaJLFZdfoGWzzQWbEXpPYHbLHXJnACSEFYiuk8lVtVeDUMdm4wU6YNsZi6C1aznNfnCFm4MwsBmcHiMFgRVl6FgS6zoOAgcB0Lu2bqxnqlZwKYCEohD6spei1bT6Du6Zl60N5ZmTYya+fMCzcyyRThmTvW1YxYo9ku9eKu+BupOUaop4aaHimi2C8wsdmC8Y8FnN3W4RljMOzthmU+CvWdwprmPF2K9uNl8rlGAbZ7pqCCHiMMJLHmxg5me16js+6b8lY8aOHqaYGB+KRfsuEo4tKfoBiBYZgc0kxDMOcIeDYth0Z8KZPkEjphEaExQtG2HoqK7r4X+eQkRqVL+NyZhBHqQyGsafRRCmU7fIiNidPMF4GMMxYlkAA */
	createMachine({
	tsTypes: {} as import('./Dashboard.machine.typegen').Typegen0,
	initial: 'Idle',
	states: {
		Category: {
			on: {
				NEXT: {
					actions: 'onSelectOperator',
					target: 'Operator',
				},
				onBlur: {
					actions: 'onBlurPurge',
					target: 'Idle',
				},
			},
		},
		Operator: {
			on: {
				NEXT: {
					actions: 'onSelectValue',
					target: 'Value',
				},
				onBlur: {
					actions: 'onBlurPurge',
					target: 'Idle',
				},
			},
		},
		Value: {
			on: {
				onBlur: {
					actions: ['onValidateQuery', 'onBlurPurge'],
					target: 'Idle',
				},
			},
		},
		Idle: {
			on: {
				NEXT: {
					actions: 'onSelectCategory',
					description: 'Select Category',
					target: 'Category',
				},
			},
		},
	},
	id: 'Dashboard Search And Filter',
});
