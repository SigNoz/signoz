**_Frontend Guidelines_**

1. Make component as small as possible (and divide those into individual one)

2. modularize the function down to follow SRP. The function’s name should itself signify what it is meant to do.

3. Break functions semantically into small as possible.

4. No function should exceed more than 40 lines

5. Follow DRY. If the same functionality is used at multiple places move it to a commonplace and reuse it.

6. API/Service files should not have business logic. It removes the flexibility for the consumer to handle it differently.

7. **Don't pass inline object/function to react components as a prop. It will get created on every render.**

8. No hard coded string or enums

9. try to internationalize all strings

10. memoize functions, and variables judiciously. Over-optimizations can also lead to performance issues.

11. Try to avoid inline functions as much as possible. It will increase the readability and thus more comprehensible.

12. Avoid using multiple ifs' or cases in the switch. Try to create a mapper out of it and segregate in multiple functions.

13. if function expects more than 3 arguments wrap them in an object(except when it is memoized).

14. use **useMemo** and **useCallback** to memorise accordingly

15. Naming Conventions

    1. Component Name should be in Capital Case (folder should be small case)
    2. all rest should be small case

16. Where to put the component

    1. Aggregate all components and container in pages
    2. common used component in all the place should be in components
    3. data manipulated parent should in container

17. which data to put where in global state or in local

    1. start putting data from local and then move to global state

18. use rem instead of px

19. use useQuery for fetching data and useMutation for updating data

20. use useQueryClient for updating cache

*Note: Never disable eslint and typescript error (if we are disabling any rule need to write why we are disabling any rule)*
