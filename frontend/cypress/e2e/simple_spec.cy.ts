describe('Simple spec', () => {
	it('The page should load', () => {
		cy.visit('http://localhost:3301/');
		cy.contains('SigNoz');
		cy.contains('Monitor your applications. Find what is causing issues.');
	});
});
