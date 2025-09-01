export interface SessionRecording {
	id: string;
	sessionId: string;
	userName: string;
	userAgent: string;
	startTime: string;
	duration: number; // seconds
	pageViews: number;
	country: string;
	city: string;
	device: string;
	browser: string;
	os: string;
	status: 'completed' | 'in_progress' | 'failed';
	hasErrors: boolean;
	recordingUrl: string;
}
