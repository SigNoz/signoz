# **Frontend Guidelines**

Embrace the spirit of collaboration and contribute to the success of our open-source project by adhering to these frontend development guidelines with precision and passion.

### Export Style

- **React components** (`src/components/`, `src/container/`, `src/pages/`): Prefer **default exports** for the main component in each file
- **Utilities, hooks, APIs, types, constants** (`src/utils/`, `src/hooks/`, `src/api/`, `src/lib/`, `src/types/`, `src/constants/`): Prefer **named exports** for better tree-shaking and explicit imports

### Memoization (React Compiler)

This project uses [React Compiler](https://react.dev/learn/react-compiler). Follow React’s official stance:

- **New code:** Rely on the compiler. Do not add `useMemo`, `useCallback`, or `React.memo` by default.
- **Escape hatches:** Keep `useMemo` / `useCallback` when you need precise control (especially values used as effect dependencies).
- **`React.memo`:** Usually unnecessary with the compiler.
- **Existing memos:** Leave them in place, or remove only with careful testing (removal can change compilation output).
- **Mass prune is not blanket-safe:** Do not strip memos across a feature just because the compiler is enabled. Identity-sensitive values (effect deps, imperative chart/list APIs) still need stable references the compiler does not always preserve.
- **Holdout patterns** (keep manual memoization or `"use no memo"` until proven safe):
  - uPlot `options` / panel `config` builders (chart teardown if identity churns)
  - Virtuoso `itemContent` / `getItemContent` (and row components passed into virtualized lists)
  - URLSearchParams hooks (`useUrlQuery` / `useUrlQueryData`) whose return identity feeds effect dependency arrays
- **`"use no memo"`:** Use only for holdouts that must skip compilation.

See [What should I do about useMemo, useCallback, and React.memo?](https://react.dev/learn/react-compiler/introduction#what-should-i-do-about-usememo-usecallback-and-reactmemo).

### React and Components

- Strive to create small and modular components, ensuring they are divided into individual pieces for improved maintainability and reusability.
- Minimize the use of inline functions whenever possible to enhance code readability and improve overall comprehension.
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

- Do not disable oxlint or TypeScript errors without a clear, justified explanation. Keeping lint and type-checking strict protects merge safety (including React Compiler Rules of React via `react-hooks-js/*`).
- Tooling:

  - [oxlint](https://oxc.rs/docs/guide/usage/linter.html) — primary JS/TS linter (includes TypeScript, React, a11y, import, Jest, and `react-hooks-js` / React Compiler rules)
  - [oxfmt](https://oxc.rs/docs/guide/usage/formatter.html) — code formatting (replaces Prettier in this package)
  - [stylelint](https://stylelint.io/) — SCSS/CSS linting
  - TypeScript (`tsgo` / `tsc`) — type-checking

  Prefer fixing violations over disabling rules. Pre-commit runs oxlint without `--quiet` so compiler and other warnings are not swallowed.

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
