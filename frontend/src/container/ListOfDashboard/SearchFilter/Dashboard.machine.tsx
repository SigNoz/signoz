import { createMachine } from 'xstate';

export const DashboardSearchAndFilter = createMachine({
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
