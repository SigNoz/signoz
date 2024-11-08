export type AlertStatusProps =
	| { status: 'firing'; timestamp: number }
	| { status: 'resolved'; timestamp?: number };

export type StatusConfig = {
	firing: {
		icon: JSX.Element;
		text: string;
		extraInfo: JSX.Element | null;
		className: string;
	};
	resolved: {
		icon: JSX.Element;
		text: string;
		extraInfo: JSX.Element | null;
		className: string;
	};
};
