export interface Props {
	start: number;
	end: number;
	other: {
		[k: string]: string[];
	};
}

interface TagsKeys {
	tagKeys: string;
}

export type PayloadProps = TagsKeys[];
