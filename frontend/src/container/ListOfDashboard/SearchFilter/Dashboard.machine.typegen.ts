// This file was automatically generated. Edits will be overwritten

export interface Typegen0 {
	'@@xstate/typegen': true;
	internalEvents: {
		'xstate.init': { type: 'xstate.init' };
	};
	invokeSrcNameMap: {};
	missingImplementations: {
		actions:
			| 'onBlurPurge'
			| 'onSelectCategory'
			| 'onSelectOperator'
			| 'onSelectValue'
			| 'onValidateQuery';
		delays: never;
		guards: never;
		services: never;
	};
	eventsCausingActions: {
		onBlurPurge: 'onBlur';
		onSelectCategory: 'NEXT';
		onSelectOperator: 'NEXT';
		onSelectValue: 'NEXT';
		onValidateQuery: 'onBlur';
	};
	eventsCausingDelays: {};
	eventsCausingGuards: {};
	eventsCausingServices: {};
	matchesStates: 'Category' | 'Idle' | 'Operator' | 'Value';
	tags: never;
}
