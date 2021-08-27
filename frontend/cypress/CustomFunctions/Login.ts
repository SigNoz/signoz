import ROUTES from "constants/routes";

const Login = ({ email, name }: LoginProps): void => {
	const emailInput = cy.findByPlaceholderText("mike@netflix.com");

	emailInput.then((emailInput) => {
		const element = emailInput[0];
		// element is present
		expect(element).not.undefined;
		expect(element.nodeName).to.be.equal("INPUT");
	});
	emailInput.type(email).then((inputElements) => {
		const inputElement = inputElements[0];
		const inputValue = inputElement.getAttribute("value");
		expect(inputValue).to.be.equals(email);
	});

	const firstNameInput = cy.findByPlaceholderText("Mike");
	firstNameInput.then((firstNameInput) => {
		const element = firstNameInput[0];
		// element is present
		expect(element).not.undefined;
		expect(element.nodeName).to.be.equal("INPUT");
	});

	firstNameInput.type(name).then((inputElements) => {
		const inputElement = inputElements[0];
		const inputValue = inputElement.getAttribute("value");
		expect(inputValue).to.be.equals(name);
	});

	const gettingStartedButton = cy.get("button");
	gettingStartedButton.click();

	cy.location("pathname").then((e) => {
		expect(e).to.be.equal(ROUTES.APPLICATION);
	});
};

export interface LoginProps {
	email: string;
	name: string;
}

export default Login;
