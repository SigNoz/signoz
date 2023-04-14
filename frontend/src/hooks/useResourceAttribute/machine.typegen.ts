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
			| 'onSelectOperator'
			| 'onSelectTagKey'
			| 'onSelectTagValue'
			| 'onValidateQuery';
		delays: never;
		guards: never;
		services: never;
	};
	eventsCausingActions: {
		onBlurPurge: 'onBlur';
		onSelectOperator: 'NEXT';
		onSelectTagKey: 'NEXT';
		onSelectTagValue: 'NEXT';
		onValidateQuery: 'onBlur';
	};
	eventsCausingDelays: {};
	eventsCausingGuards: {};
	eventsCausingServices: {};
	matchesStates: 'Idle' | 'Operator' | 'TagKey' | 'TagValue';
	tags: never;
}
