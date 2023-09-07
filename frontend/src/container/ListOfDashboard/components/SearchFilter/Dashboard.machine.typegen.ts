// This file was automatically generated. Edits will be overwritten

export interface Typegen0 {
	'@@xstate/typegen': true;
	eventsCausingActions: {
		onSelectOperator: 'NEXT';
		onBlurPurge: 'onBlur';
		onSelectValue: 'NEXT';
		onValidateQuery: 'onBlur';
		onSelectCategory: 'NEXT';
	};
	internalEvents: {
		'xstate.init': { type: 'xstate.init' };
	};
	invokeSrcNameMap: {};
	missingImplementations: {
		actions:
			| 'onSelectOperator'
			| 'onBlurPurge'
			| 'onSelectValue'
			| 'onValidateQuery'
			| 'onSelectCategory';
		services: never;
		guards: never;
		delays: never;
	};
	eventsCausingServices: {};
	eventsCausingGuards: {};
	eventsCausingDelays: {};
	matchesStates: 'Category' | 'Operator' | 'Value' | 'Idle';
	tags: never;
}
