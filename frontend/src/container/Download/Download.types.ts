export type DownloadOptions = {
	isDownloadEnabled: boolean;
	fileName: string;
	columnLabels?: Record<string, string>;
};

export type DownloadProps = {
	data: Record<string, string>[];
	isLoading?: boolean;
	fileName: string;
};
