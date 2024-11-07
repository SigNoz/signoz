export const onboardingHelpMessage = (
	dataSourceName: string,
	moduleId: string,
): string => `Hi Team,

I am facing issues sending data to SigNoz. Here are my application details

Data Source: ${dataSourceName}
Framework:
Environment:
Module: ${moduleId}

Thanks
`;
