// This file was automatically generated. Edits will be overwritten

export interface Typegen0 {
	'@@xstate/typegen': true;
	eventsCausingActions: {
		onSelectOperator: 'NEXT';
		onBlurPurge: 'onBlur';
		onSelectTagValue: 'NEXT';
		onValidateQuery: 'onBlur';
		onSelectTagKey: 'NEXT';
	};
	internalEvents: {
		'xstate.init': { type: 'xstate.init' };
	};
	invokeSrcNameMap: {};
	missingImplementations: {
		actions:
			| 'onSelectOperator'
			| 'onBlurPurge'
			| 'onSelectTagValue'
			| 'onValidateQuery'
			| 'onSelectTagKey';
		services: never;
		guards: never;
		delays: never;
	};
	eventsCausingServices: {};
	eventsCausingGuards: {};
	eventsCausingDelays: {};
	matchesStates: 'TagKey' | 'Operator' | 'TagValue' | 'Idle';
	tags: never;
}
