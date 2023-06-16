# **Frontend Guidelines**

Embrace the spirit of collaboration and contribute to the success of our open-source project by adhering to these frontend development guidelines with precision and passion.

### React and Components

- Strive to create small and modular components, ensuring they are divided into individual pieces for improved maintainability and reusability.
- Avoid passing inline objects or functions as props to React components, as they are recreated with each render cycle.
  Utilize careful memoization of functions and variables, balancing optimization efforts to prevent potential performance issues. [When to useMemo and useCallback](https://kentcdodds.com/blog/usememo-and-usecallback) by Kent C. Dodds is quite helpful for this scenario.
- Minimize the use of inline functions whenever possible to enhance code readability and improve overall comprehension.
- Employ the appropriate usage of useMemo and useCallback hooks for effective memoization of values and functions.
- Determine the appropriate placement of components:
  - Pages should contain an aggregation of all components and containers.
  - Commonly used components should reside in the 'components' directory.
  - Parent components responsible for data manipulation should be placed in the 'container' directory.
- Strategically decide where to store data, either in global state or local components:
  - Begin by storing data in local components and gradually transition to global state as necessary.
- Avoid importing default namespace `React` as the project is using `v18` and `import React from 'react'` is not needed anymore.
- When a function requires more than three arguments (except when memoized), encapsulate them within an object to enhance readability and reduce potential parameter complexity.

### API and Services

- Avoid incorporating business logic within API/Service files to maintain flexibility for consumers to handle it according to their specific needs.
- Employ the use of the useQuery hook for fetching data and the useMutation hook for updating data, ensuring a consistent and efficient approach.
- Utilize the useQueryClient hook when updating the cache, facilitating smooth and effective management of data within the application.

**Note -** In our project, we are utilizing React Query v3. To gain a comprehensive understanding of its features and implementation, we recommend referring to the [official documentation](https://tanstack.com/query/v3/docs/react/overview) as a valuable resource.

### Styling

- Refrain from using inline styling within React components to maintain separation of concerns and promote a more maintainable codebase.
- Opt for using the rem unit instead of px values to ensure better scalability and responsiveness across different devices and screen sizes.

### Linting and Setup

- It is crucial to refrain from disabling ESLint and TypeScript errors within the project. If there is a specific rule that needs to be disabled, provide a clear and justified explanation for doing so. Maintaining the integrity of the linting and type-checking processes ensures code quality and consistency throughout the codebase.
- In our project, we rely on several essential ESLint plugins, namely:
  - [plugin:@typescript-eslint](https://typescript-eslint.io/rules/)
  - [airbnb styleguide](https://github.com/airbnb/javascript)
  - [plugin:sonarjs](https://github.com/SonarSource/eslint-plugin-sonarjs)

    To ensure compliance with our coding standards and best practices, we encourage you to refer to the documentation of these plugins. Familiarizing yourself with the ESLint rules they provide will help maintain code quality and consistency throughout the project.

### Naming Conventions

- Ensure that component names are written in Capital Case, while the folder names should be in lowercase.
- Keep all other elements, such as variables, functions, and file names, in lowercase.

### Miscellaneous

- Ensure that functions are modularized and follow the Single Responsibility Principle (SRP). The function's name should accurately convey its purpose and functionality.
- Semantic division of functions into smaller units should be prioritized for improved readability and maintainability.
  Aim to keep functions concise and avoid exceeding a maximum length of 40 lines to enhance code understandability and ease of maintenance.
- Eliminate the use of hard-coded strings or enums, favoring a more flexible and maintainable approach.
- Strive to internationalize all strings within the codebase to support localization and improve accessibility for users across different languages.
- Minimize the usage of multiple if statements or switch cases within a function. Consider creating a mapper and separating logic into multiple functions for better code organization.
