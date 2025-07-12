export type Media = {
	id: number;
	documentId: string;
	ext: string;
	url: string;
	mime: string;
	alternativeText: string | null;
	[key: string]: any; // Allow other fields (e.g., mime, size) to be flexible
};

export enum DeploymentType {
	ALL = 'All',
	CLOUD_ONLY = 'Cloud only',
	OSS_ONLY = 'OSS Only',
}

type Feature = {
	id: number;
	documentId: string;
	title: string;
	sort_order: number | null;
	createdAt: string;
	updatedAt: string;
	publishedAt: string;
	description: string;
	deployment_type: DeploymentType;
	media: Media | null;
};

export interface ChangelogSchema {
	id: number;
	documentId: string;
	version: string;
	release_date: string;
	bug_fixes: string | null;
	maintenance: string | null;
	createdAt: string;
	updatedAt: string;
	publishedAt: string;
	features: Feature[];
}

export const SupportedImageTypes = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

export const SupportedVideoTypes = ['.mp4', '.webm'];
