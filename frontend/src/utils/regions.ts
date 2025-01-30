export interface Region {
	id: string;
	name: string;
	subRegions: SubRegion[];
}
export interface SubRegion {
	id: string;
	name: string;
	displayName: string;
}
const regions: Region[] = [
	{
		id: 'north-america',
		name: 'North America',
		subRegions: [
			{ id: 'us-east-1', name: 'us-east-1', displayName: 'US East (N. Virginia)' },
			{ id: 'us-east-2', name: 'us-east-2', displayName: 'US East (Ohio)' },
			{
				id: 'us-west-1',
				name: 'us-west-1',
				displayName: 'US West (N. California)',
			},
			{ id: 'us-west-2', name: 'us-west-2', displayName: 'US West (Oregon)' },
			{
				id: 'ca-central-1',
				name: 'ca-central-1',
				displayName: 'Canada (Central)',
			},
			{ id: 'ca-west-1', name: 'ca-west-1', displayName: 'Canada (West)' },
		],
	},
	{
		id: 'africa',
		name: 'Africa',
		subRegions: [
			{ id: 'af-south-1', name: 'af-south-1', displayName: 'Africa (Cape Town)' },
		],
	},
	{
		id: 'asia-pacific',
		name: 'Asia Pacific',
		subRegions: [
			{
				id: 'ap-east-1',
				name: 'ap-east-1',
				displayName: 'Asia Pacific (Hong Kong)',
			},
			{
				id: 'ap-northeast-1',
				name: 'ap-northeast-1',
				displayName: 'Asia Pacific (Tokyo)',
			},
			{
				id: 'ap-northeast-2',
				name: 'ap-northeast-2',
				displayName: 'Asia Pacific (Seoul)',
			},
			{
				id: 'ap-northeast-3',
				name: 'ap-northeast-3',
				displayName: 'Asia Pacific (Osaka)',
			},
			{
				id: 'ap-south-1',
				name: 'ap-south-1',
				displayName: 'Asia Pacific (Mumbai)',
			},
			{
				id: 'ap-south-2',
				name: 'ap-south-2',
				displayName: 'Asia Pacific (Hyderabad)',
			},
			{
				id: 'ap-southeast-1',
				name: 'ap-southeast-1',
				displayName: 'Asia Pacific (Singapore)',
			},
			{
				id: 'ap-southeast-2',
				name: 'ap-southeast-2',
				displayName: 'Asia Pacific (Sydney)',
			},
			{
				id: 'ap-southeast-3',
				name: 'ap-southeast-3',
				displayName: 'Asia Pacific (Jakarta)',
			},
			{
				id: 'ap-southeast-4',
				name: 'ap-southeast-4',
				displayName: 'Asia Pacific (Melbourne)',
			},
			{
				id: 'ap-southeast-5',
				name: 'ap-southeast-5',
				displayName: 'Asia Pacific (Auckland)',
			},
		],
	},
	{
		id: 'europe',
		name: 'Europe',
		subRegions: [
			{
				id: 'eu-central-1',
				name: 'eu-central-1',
				displayName: 'Europe (Frankfurt)',
			},
			{ id: 'eu-central-2', name: 'eu-central-2', displayName: 'Europe (Zurich)' },
			{ id: 'eu-north-1', name: 'eu-north-1', displayName: 'Europe (Stockholm)' },
			{ id: 'eu-south-1', name: 'eu-south-1', displayName: 'Europe (Milan)' },
			{ id: 'eu-south-2', name: 'eu-south-2', displayName: 'Europe (Spain)' },
			{ id: 'eu-west-1', name: 'eu-west-1', displayName: 'Europe (Ireland)' },
			{ id: 'eu-west-2', name: 'eu-west-2', displayName: 'Europe (London)' },
			{ id: 'eu-west-3', name: 'eu-west-3', displayName: 'Europe (Paris)' },
		],
	},
	{
		id: 'middle-east',
		name: 'Middle East',
		subRegions: [
			{
				id: 'il-central-1',
				name: 'il-central-1',
				displayName: 'Israel (Tel Aviv)',
			},
			{
				id: 'me-central-1',
				name: 'me-central-1',
				displayName: 'Middle East (UAE)',
			},
			{
				id: 'me-south-1',
				name: 'me-south-1',
				displayName: 'Middle East (Bahrain)',
			},
		],
	},
	{
		id: 'south-america',
		name: 'South America',
		subRegions: [
			{
				id: 'sa-east-1',
				name: 'sa-east-1',
				displayName: 'South America (São Paulo)',
			},
		],
	},
];

export { regions };
