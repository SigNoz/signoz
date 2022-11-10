export interface ConfigProps {
	Enabled: boolean;
	FrontendPositionId: string;
	Components: Array<{
		Text: string;
		Position: number;
		IconLink: string;
		Href: string;
	}>;
}
export interface PayloadProps {
	[key: string]: ConfigProps;
}
