export type DownloadOptions = {
	isDownloadEnabled: boolean;
	fileName: string;
	columnLabels?: Record<string, string>;
	valueTransforms?: Record<string, (value: string) => string>;
};

export type DownloadProps = {
	data: Record<string, string>[];
	isLoading?: boolean;
	fileName: string;
};
