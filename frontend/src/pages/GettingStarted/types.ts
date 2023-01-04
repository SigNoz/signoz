export type TGetStartedContentDoc = {
	title: string;
	icon: JSX.Element;
	url: string;
};
export type TGetStartedContentSection = {
	heading: string;
	description?: string | JSX.Element;
	items: TGetStartedContentDoc[];
};
