const resizeObserverLoopErrRe = /ResizeObserver loop limit exceeded/;

const unCaughtExpection = () => {
	cy.on('uncaught:exception', (err) => {
		if (resizeObserverLoopErrRe.test(err.message)) {
			// returning false here prevents Cypress from
			// failing the test
			return false;
		}
		return true;
	});
};

export default unCaughtExpection;
