// This file was automatically generated. Edits will be overwritten

export interface Typegen0 {
	'@@xstate/typegen': true;
	eventsCausingActions: {
		onSelectLabelValue: 'NEXT' | 'onBlur';
		onValidateQuery: 'NEXT' | 'onBlur';
		onSelectLabelKey: 'NEXT';
	};
	internalEvents: {
		'xstate.init': { type: 'xstate.init' };
	};
	invokeSrcNameMap: {};
	missingImplementations: {
		actions: 'onSelectLabelValue' | 'onValidateQuery' | 'onSelectLabelKey';
		services: never;
		guards: never;
		delays: never;
	};
	eventsCausingServices: {};
	eventsCausingGuards: {};
	eventsCausingDelays: {};
	matchesStates: 'LabelKey' | 'LabelValue' | 'Idle';
	tags: never;
}
