export const licensesSuccessResponse = {
	status: 'success',
	data: {
		trialStart: 1695992049,
		trialEnd: 1697806449,
		onTrial: true,
		workSpaceBlock: false,
		trialConvertedToSubscription: false,
		gracePeriodEnd: -1,
		licenses: [
			{
				key: 'testKeyId-a092-4c62-b010-10453c9a5e41',
				activationId: 'testActivationId-dd3f-4a4d-a8dc-fb39f17c9faa',
				ValidationMessage: '',
				isCurrent: false,
				planKey: 'ENTERPRISE_PLAN',
				ValidFrom: '2022-10-13T13:48:51Z',
				ValidUntil: '2023-10-13T19:37:37Z',
				status: 'VALID',
			},
			{
				key: 'testKeyId-3bdb-44e7-8c89-a9be237939f4',
				activationId: 'testActivationId-cd13-47f7-8937-843a42eac592',
				ValidationMessage: '',
				isCurrent: true,
				planKey: 'ENTERPRISE_PLAN',
				ValidFrom: '2023-09-12T11:35:43Z',
				ValidUntil: '2024-09-11T17:24:29Z',
				status: 'VALID',
			},
		],
	},
};

export const trialConvertedToSubscriptionResponse = {
	status: 'success',
	data: {
		trialStart: 1695992049,
		trialEnd: 1697806449,
		onTrial: true,
		workSpaceBlock: false,
		trialConvertedToSubscription: true,
		gracePeriodEnd: -1,
		licenses: [
			{
				key: 'testKeyId-a092-4c62-b010-10453c9a5e41',
				activationId: 'testActivationId-dd3f-4a4d-a8dc-fb39f17c9faa',
				ValidationMessage: '',
				isCurrent: false,
				planKey: 'ENTERPRISE_PLAN',
				ValidFrom: '2022-10-13T13:48:51Z',
				ValidUntil: '2023-10-13T19:37:37Z',
				status: 'VALID',
			},
			{
				key: 'testKeyId-3bdb-44e7-8c89-a9be237939f4',
				activationId: 'testActivationId-cd13-47f7-8937-843a42eac592',
				ValidationMessage: '',
				isCurrent: true,
				planKey: 'ENTERPRISE_PLAN',
				ValidFrom: '2023-09-12T11:35:43Z',
				ValidUntil: '2024-09-11T17:24:29Z',
				status: 'VALID',
			},
		],
	},
};

export const notOfTrailResponse = {
	...trialConvertedToSubscriptionResponse,
	data: {
		...trialConvertedToSubscriptionResponse.data,
		onTrial: false,
		trialConvertedToSubscriptionResponse: false,
		trialStart: -1,
		trialEnd: -1,
	},
};

export const workSpaceBlockResponse = {
	...trialConvertedToSubscriptionResponse,
	data: {
		...trialConvertedToSubscriptionResponse.data,
		onTrial: false,
		trialConvertedToSubscriptionResponse: false,
		trialStart: -1,
		trialEnd: -1,
		workSpaceBlock: true,
	},
};
