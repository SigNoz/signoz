import OnboardingContainer from 'container/OnboardingContainer';

const onboardingPageStyles: React.CSSProperties = {
	display: 'flex',
	justifyContent: 'center',
	width: '100%',
	minHeight: 'calc(100vh - 50px)',
	color: '#fff',
};

function OnboardingPage(): JSX.Element {
	return (
		<div style={onboardingPageStyles}>
			<OnboardingContainer />
		</div>
	);
}

export default OnboardingPage;
