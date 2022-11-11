export interface ConfigProps {
	enabled: boolean;
	frontendPositionId: string;
	components: Array<{
		href: string;
		iconLink: string;
		position: 1;
		text: string;
	}>;
}
export interface PayloadProps {
	[key: string]: ConfigProps;
}
