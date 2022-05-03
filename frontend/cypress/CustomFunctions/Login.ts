/* eslint-disable @typescript-eslint/no-unused-expressions */
const Login = ({ email, name }: LoginProps): void => {
	const emailInput = cy.findByPlaceholderText('name@yourcompany.com');

	emailInput.then((emailInput) => {
		const element = emailInput[0];
		// element is present
		expect(element).not.undefined;
		expect(element.nodeName).to.be.equal('INPUT');
	});
	emailInput.type(email).then((inputElements) => {
		const inputElement = inputElements[0];
		const inputValue = inputElement.getAttribute('value');
		expect(inputValue).to.be.equals(email);
	});

	const firstNameInput = cy.findByPlaceholderText('Your Name');
	firstNameInput.then((firstNameInput) => {
		const element = firstNameInput[0];
		// element is present
		expect(element).not.undefined;
		expect(element.nodeName).to.be.equal('INPUT');
	});

	firstNameInput.type(name).then((inputElements) => {
		const inputElement = inputElements[0];
		const inputValue = inputElement.getAttribute('value');
		expect(inputValue).to.be.equals(name);
	});

	const gettingStartedButton = cy.findByText('Get Started');
	gettingStartedButton.click();

	cy
		.intercept('POST', '/api/v1/user?email*', {
			statusCode: 200,
		})
		.as('defaultUser');

	cy.wait('@defaultUser');
};

export interface LoginProps {
	email: string;
	name: string;
}

export default Login;
