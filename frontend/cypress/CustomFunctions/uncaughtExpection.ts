const resizeObserverLoopErrRe = /ResizeObserver loop limit exceeded/;

const unCaughtExpection = (): void => {
	cy.on('uncaught:exception', (err) => {
		// returning false here prevents Cypress from
		// failing the test
		return !resizeObserverLoopErrRe.test(err.message);
	});
};

export default unCaughtExpection;
