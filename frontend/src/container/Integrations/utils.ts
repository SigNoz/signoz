import { navigate } from 'lib/router/navigation';

export const handleContactSupport = (isCloudUser: boolean): void => {
	if (isCloudUser) {
		navigate('/support');
	} else {
		window.open('https://signoz.io/slack', '_blank');
	}
};
