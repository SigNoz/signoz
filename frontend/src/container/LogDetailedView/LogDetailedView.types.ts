export interface BodyTitleRendererProps {
	title: string;
	nodeKey: string;
	value: unknown;
	parentIsArray?: boolean;
}

export type AnyObject = { [key: string]: any };
