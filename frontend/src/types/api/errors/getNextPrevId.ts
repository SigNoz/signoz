export type Props = {
	errorID: string;
	timestamp: string;
	groupID: string;
};

export type PayloadProps = {
	prevErrorID: string;
	nextErrorID: string;
	groupID: string;
	nextTimestamp: string;
	prevTimestamp: string;
};
