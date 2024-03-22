export type DownloadOptions = {
	isDownloadEnabled: boolean;
	fileName: string;
};

export type DownloadProps = {
	data: Record<string, string>[];
	isLoading?: boolean;
	fileName: string;
};
