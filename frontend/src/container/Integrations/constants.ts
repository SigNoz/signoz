import { AzureRegion } from './types';

export const INTEGRATION_TELEMETRY_EVENTS = {
	INTEGRATIONS_LIST_VISITED: 'Integrations Page: Visited the list page',
	INTEGRATIONS_ITEM_LIST_CLICKED: 'Integrations Page: Clicked an integration',
	INTEGRATIONS_DETAIL_CONNECT:
		'Integrations Detail Page: Clicked connect integration button',
	INTEGRATIONS_DETAIL_TEST_CONNECTION:
		'Integrations Detail Page: Clicked test Connection button for integration',
	INTEGRATIONS_DETAIL_REMOVE_INTEGRATION:
		'Integrations Detail Page: Clicked remove Integration button for integration',
	INTEGRATIONS_DETAIL_CONFIGURE_INSTRUCTION:
		'Integrations Detail Page: Navigated to configure an integration',
	AWS_INTEGRATION_ACCOUNT_REMOVED:
		'AWS Integration Detail page: Clicked remove Integration button for integration',
};

export const INTEGRATION_TYPES = {
	AWS: 'aws',
	AZURE: 'azure',
};

export const AWS_INTEGRATION = {
	id: INTEGRATION_TYPES.AWS,
	title: 'Amazon Web Services',
	description: 'One click setup for AWS monitoring with SigNoz',
	author: {
		name: 'SigNoz',
		email: 'integrations@signoz.io',
		homepage: 'https://signoz.io',
	},
	icon: `/Logos/aws-dark.svg`,
	icon_alt: 'aws-logo',
	is_installed: false,
	is_new: false,
};

export const AZURE_INTEGRATION = {
	id: INTEGRATION_TYPES.AZURE,
	title: 'Microsoft Azure',
	description: 'One click setup for Azure monitoring with SigNoz',
	author: {
		name: 'SigNoz',
		email: 'integrations@signoz.io',
		homepage: 'https://signoz.io',
	},
	icon: `/Logos/azure-openai.svg`,
	icon_alt: 'azure-logo',
	is_installed: false,
	is_new: true,
};

export const ONE_CLICK_INTEGRATIONS = [AZURE_INTEGRATION, AWS_INTEGRATION];

export const AZURE_REGIONS: AzureRegion[] = [
	{
		label: 'Australia Central',
		value: 'australiacentral',
		geography: 'Australia',
	},
	{
		label: 'Australia Central 2',
		value: 'australiacentral2',
		geography: 'Australia',
	},
	{ label: 'Australia East', value: 'australiaeast', geography: 'Australia' },
	{
		label: 'Australia Southeast',
		value: 'australiasoutheast',
		geography: 'Australia',
	},
	{ label: 'Austria East', value: 'austriaeast', geography: 'Austria' },
	{ label: 'Belgium Central', value: 'belgiumcentral', geography: 'Belgium' },
	{ label: 'Brazil South', value: 'brazilsouth', geography: 'Brazil' },
	{ label: 'Brazil Southeast', value: 'brazilsoutheast', geography: 'Brazil' },
	{ label: 'Canada Central', value: 'canadacentral', geography: 'Canada' },
	{ label: 'Canada East', value: 'canadaeast', geography: 'Canada' },
	{ label: 'Central India', value: 'centralindia', geography: 'India' },
	{ label: 'Central US', value: 'centralus', geography: 'United States' },
	{ label: 'Chile Central', value: 'chilecentral', geography: 'Chile' },
	{ label: 'East Asia', value: 'eastasia', geography: 'Asia Pacific' },
	{ label: 'East US', value: 'eastus', geography: 'United States' },
	{ label: 'East US 2', value: 'eastus2', geography: 'United States' },
	{ label: 'France Central', value: 'francecentral', geography: 'France' },
	{ label: 'France South', value: 'francesouth', geography: 'France' },
	{ label: 'Germany North', value: 'germanynorth', geography: 'Germany' },
	{
		label: 'Germany West Central',
		value: 'germanywestcentral',
		geography: 'Germany',
	},
	{
		label: 'Indonesia Central',
		value: 'indonesiacentral',
		geography: 'Indonesia',
	},
	{ label: 'Israel Central', value: 'israelcentral', geography: 'Israel' },
	{ label: 'Italy North', value: 'italynorth', geography: 'Italy' },
	{ label: 'Japan East', value: 'japaneast', geography: 'Japan' },
	{ label: 'Japan West', value: 'japanwest', geography: 'Japan' },
	{ label: 'Korea Central', value: 'koreacentral', geography: 'Korea' },
	{ label: 'Korea South', value: 'koreasouth', geography: 'Korea' },
	{ label: 'Malaysia West', value: 'malaysiawest', geography: 'Malaysia' },
	{ label: 'Mexico Central', value: 'mexicocentral', geography: 'Mexico' },
	{
		label: 'New Zealand North',
		value: 'newzealandnorth',
		geography: 'New Zealand',
	},
	{
		label: 'North Central US',
		value: 'northcentralus',
		geography: 'United States',
	},
	{ label: 'North Europe', value: 'northeurope', geography: 'Europe' },
	{ label: 'Norway East', value: 'norwayeast', geography: 'Norway' },
	{ label: 'Norway West', value: 'norwaywest', geography: 'Norway' },
	{ label: 'Poland Central', value: 'polandcentral', geography: 'Poland' },
	{ label: 'Qatar Central', value: 'qatarcentral', geography: 'Qatar' },
	{
		label: 'South Africa North',
		value: 'southafricanorth',
		geography: 'South Africa',
	},
	{
		label: 'South Africa West',
		value: 'southafricawest',
		geography: 'South Africa',
	},
	{
		label: 'South Central US',
		value: 'southcentralus',
		geography: 'United States',
	},
	{ label: 'South India', value: 'southindia', geography: 'India' },
	{ label: 'Southeast Asia', value: 'southeastasia', geography: 'Asia Pacific' },
	{ label: 'Spain Central', value: 'spaincentral', geography: 'Spain' },
	{ label: 'Sweden Central', value: 'swedencentral', geography: 'Sweden' },
	{
		label: 'Switzerland North',
		value: 'switzerlandnorth',
		geography: 'Switzerland',
	},
	{
		label: 'Switzerland West',
		value: 'switzerlandwest',
		geography: 'Switzerland',
	},
	{ label: 'UAE Central', value: 'uaecentral', geography: 'UAE' },
	{ label: 'UAE North', value: 'uaenorth', geography: 'UAE' },
	{ label: 'UK South', value: 'uksouth', geography: 'United Kingdom' },
	{ label: 'UK West', value: 'ukwest', geography: 'United Kingdom' },
	{
		label: 'West Central US',
		value: 'westcentralus',
		geography: 'United States',
	},
	{ label: 'West Europe', value: 'westeurope', geography: 'Europe' },
	{ label: 'West India', value: 'westindia', geography: 'India' },
	{ label: 'West US', value: 'westus', geography: 'United States' },
	{ label: 'West US 2', value: 'westus2', geography: 'United States' },
	{ label: 'West US 3', value: 'westus3', geography: 'United States' },
];
