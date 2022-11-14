export interface ConfigProps {
	enabled: boolean;
	frontendPositionId: string;
	components: Array<{
		href: string;
		darkIcon: string;
		lightIcon: string;
		position: 1;
		text: string;
	}>;
}
export interface PayloadProps {
	[key: string]: ConfigProps;
}
