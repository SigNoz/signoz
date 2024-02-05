export const billingSuccessResponse = {
	status: 'success',
	data: {
		billingPeriodStart: 1697197809,
		billingPeriodEnd: 1698777000,
		details: {
			total: 1278.3,
			breakdown: [
				{
					type: 'Metrics',
					unit: 'Million',
					tiers: [
						{
							unitPrice: 0.1,
							quantity: 4012,
							tierStart: 0,
							tierEnd: 0,
							tierCost: 401.2,
						},
					],
				},
				{
					type: 'Traces',
					unit: 'GB',
					tiers: [
						{
							unitPrice: 0.3,
							quantity: 2261,
							tierStart: 0,
							tierEnd: 0,
							tierCost: 678.3,
						},
					],
				},
				{
					type: 'Logs',
					unit: 'GB',
					tiers: [
						{
							unitPrice: 0.4,
							quantity: 497,
							tierStart: 0,
							tierEnd: 0,
							tierCost: 198.8,
						},
					],
				},
			],
			baseFee: 199,
			billTotal: 1278.3,
		},
		discount: 0,
	},
};
