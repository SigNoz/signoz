# Contributing Guidelines

Hi there! We're thrilled that you'd like to contribute to this project, thank you for your interest. Whether it's a bug report, new feature, correction, or additional documentation, we greatly value feedback and contributions from our community.

Please read through this document before submitting any issues or pull requests to ensure we have all the necessary information to effectively respond to your bug report or contribution.

## How can I contribute?

Looking at the existing issues is a great way to find something to contribute on.  Also, have a look at these [good first issues label](https://github.com/SigNoz/signoz/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) to start with.

Before making any significant changes and before filing a new issue, please check [existing open](https://github.com/SigNoz/signoz/issues?q=is%3Aopen+is%3Aissue), or [recently closed](https://github.com/SigNoz/signoz/issues?q=is%3Aissue+is%3Aclosed) issues to make sure somebody else hasn't already reported the issue. Please try to include as much information as you can. 

**Issue Types** - [Bug Report](https://github.com/SigNoz/signoz/issues/new?assignees=&labels=&template=bug_report.md&title=) | [Feature Request](https://github.com/SigNoz/signoz/issues/new?assignees=&labels=&template=feature_request.md&title=) | [Performance Issue Report](https://github.com/SigNoz/signoz/issues/new?assignees=&labels=&template=performance-issue-report.md&title=) | [Request Dashboard](https://github.com/SigNoz/signoz/issues/new?assignees=&labels=dashboard-template&projects=&template=request_dashboard.md&title=%5BDashboard+Request%5D+) | [Report a Security Vulnerability](https://github.com/SigNoz/signoz/security/policy)

- If you find any **bugs** → please create an [**issue.**](https://github.com/SigNoz/signoz/issues/new?assignees=&labels=&template=bug_report.md&title=)
- If you find anything **missing** in documentation → you can create an issue with the label **`documentation`**.
- If you want to build any **new feature** → please create an issue with the label [**`enhancement`**](https://github.com/SigNoz/signoz/issues/new?assignees=&labels=&template=feature_request.md&title=)
- If you want to **discuss** something about the product, start a new [**discussion**](https://github.com/SigNoz/signoz/discussions)
- If you want to request a new **dashboard template** → please create an issue [here](https://github.com/SigNoz/signoz/issues/new?assignees=&labels=dashboard-template&projects=&template=request_dashboard.md&title=%5BDashboard+Request%5D+).

Details like these are incredibly useful:

- **Requirement** - what kind of use case are you trying to solve?
- **Proposal** - what do you suggest to solve the problem or improve the existing
  situation?
- Any open questions to address❓

### Reporting Bug(s)

If you are reporting a bug, details like these are incredibly useful:

- A reproducible test case or series of steps.
- The version of our code being used.
- Any modifications you've made relevant to the bug🐞.
- Anything unusual about your environment or deployment.

Discussing your proposed changes ahead of time will make the contribution process smooth for everyone 🙌.

### Opening Pull Request(s)

Contributions via pull requests are much appreciated. Once the approach is agreed upon ✅, make your changes and open a Pull Request(s). 
Before sending us a pull request, please ensure that,

- Fork the SigNoz repo on GitHub, clone it on your machine.
- Create a branch with your changes.
- You are working against the latest source on the `main` branch.
- Modify the source; please focus only on the specific change you are contributing.
- Ensure local tests pass.
- Commit to your fork using clear commit messages.
- Send us a pull request, answering any default questions in the pull request interface.
- Pay attention to any automated CI failures reported in the pull request, and stay involved in the conversation
- Once you've pushed your commits to GitHub, make sure that your branch can be auto-merged (there are no merge conflicts). If not, on your computer, merge main into your branch, resolve any merge conflicts, make sure everything still runs correctly and passes all the tests, and then push up those changes.
- Once the change has been approved and merged, we will inform you in a comment.


GitHub provides additional document on [forking a repository](https://help.github.com/articles/fork-a-repo/) and [creating a pull request](https://help.github.com/articles/creating-a-pull-request/).

**Note:** Unless your change is small, **please** consider submitting different Pull Request(s):

* 1️⃣ First PR should include the overall structure of the new component:
  * Readme, configuration, interfaces or base classes, etc...
  * This PR is usually trivial to review, so the size limit does not apply to
    it.
* 2️⃣ Second PR should include the concrete implementation of the component. If the
  size of this PR is larger than the recommended size, consider **splitting** ⚔️ it into
  multiple PRs.
* If there are multiple sub-component then ideally each one should be implemented as
  a **separate** pull request.
* Last PR should include changes to **any user-facing documentation.** And should include
  end-to-end tests if applicable. The component must be enabled
  only after sufficient testing, and there is enough confidence in the
  stability and quality of the component.

### Commit Convention

We try to follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/), more specifically the commits and PRs **should have type specifiers** prefixed in the name. [This](https://www.conventionalcommits.org/en/v1.0.0/#specification) should give you a better idea.
 
### Community

Feel free to ping us on [`#contributing`](https://signoz-community.slack.com/archives/C01LWQ8KS7M) or [`#contributing-frontend`](https://signoz-community.slack.com/archives/C027134DM8B) on our slack community if you need any help on this :)

## Where do I go from here?

- See up your [development](docs/contributing/development.md) environment.
