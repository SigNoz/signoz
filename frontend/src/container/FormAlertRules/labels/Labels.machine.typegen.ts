// This file was automatically generated. Edits will be overwritten

export interface Typegen0 {
	'@@xstate/typegen': true;
	internalEvents: {
		'xstate.init': { type: 'xstate.init' };
	};
	invokeSrcNameMap: {};
	missingImplementations: {
		actions: 'onSelectLabelKey' | 'onSelectLabelValue' | 'onValidateQuery';
		delays: never;
		guards: never;
		services: never;
	};
	eventsCausingActions: {
		onSelectLabelKey: 'NEXT';
		onSelectLabelValue: 'NEXT' | 'onBlur';
		onValidateQuery: 'NEXT' | 'onBlur';
	};
	eventsCausingDelays: {};
	eventsCausingGuards: {};
	eventsCausingServices: {};
	matchesStates: 'Idle' | 'LabelKey' | 'LabelValue';
	tags: never;
}
