# Endpoint

This guide outlines the recommended approach for designing endpoints, with a focus on entity relationships, RESTful structure, and examples from the codebase.

## How do we design an endpoint?

### Understand the core entities and their relationships

Start with understanding the core entities and their relationships. For example:

- **Organization**: an organization can have multiple users

### Structure Endpoints RESTfully

Endpoints should reflect the resource hierarchy and follow RESTful conventions. Use clear, **pluralized resource names** and versioning. For example:

- `POST /v1/organizations` — Create an organization
- `GET /v1/organizations/:id` — Get an organization by id
- `DELETE /v1/organizations/:id` — Delete an organization by id
- `PUT /v1/organizations/:id` — Update an organization by id
- `GET /v1/organizations/:id/users` — Get all users in an organization
- `GET /v1/organizations/me/users` — Get all users in my organization

Think in terms of resource navigation in a file system. For example, to find your organization, you would navigate to the root of the file system and then to the `organizations` directory. To find a user in an organization, you would navigate to the `organizations` directory and then to the `id` directory.

```bash
v1/
├── organizations/
│   └── 123/
│       └── users/
```

`me` endpoints are special. They are used to determine the actual id via some auth/external mechanism. For `me` endpoints, think of the `me` directory being symlinked to your organization directory. For example, if you are a part of the organization `123`, the `me` directory will be symlinked to `/v1/organizations/123`:

```bash
v1/
├── organizations/
│   └── me/ -> symlink to /v1/organizations/123
│       └── users/
│   └── 123/
│       └── users/
```

> 💡 **Note**: There are various ways to structure endpoints. Some prefer to use singular resource names instead of `me`. Others prefer to use singular resource names for all endpoints. We have, however, chosen to standardize our endpoints in the manner described above.

## What should I remember?

- Use clear, **plural resource names**
- Use `me` endpoints for determining the actual id via some auth mechanism

> 💡 **Note**: When in doubt, diagram the relationships and walk through the user flows as if navigating a file system. This will help you design endpoints that are both logical and user-friendly.
