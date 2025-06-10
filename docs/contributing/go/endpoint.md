# Endpoint Design

Designing robust, intuitive, and maintainable API endpoints is crucial for building scalable systems in SigNoz. This guide outlines the recommended approach for designing endpoints, with a focus on entity relationships, RESTful structure, and practical examples.

## How do we design an endpoint?

The process of designing an endpoint starts with understanding the core entities and their relationships. For example:

- **Tenant**: Can have multiple users
- **Tenant**: Can have multiple deployments
- **Deployment**: Has one license
- **Deployment**: Has a versioned config

Once you have mapped out the entities and their relationships, you can begin to design the endpoints that expose these resources.

### 1. Map Entity Relationships

Start by diagramming the relationships between your entities. This helps clarify the hierarchy and informs the endpoint structure. For example:

- A tenant contains users and deployments
- Each deployment belongs to a tenant and has a license and config

### 2. Structure Endpoints RESTfully

Endpoints should reflect the resource hierarchy and follow RESTful conventions. Use clear, pluralized resource names and versioning. For example:

- `POST /v1/users` — Create a user

### 3. Think in Terms of Resource Navigation

Design endpoints as if navigating a folder structure. Let us take an example of deleting a deployment to understand this. Thinking in terms of folder structure, our objective is to navigate till the specific deployment we need and delete it. First we open the tenant in which we have deployments -> `/v1/tenants/me` and now we need to navigate to the deployments under this -> `/v1/tenants/me/deployments` and finally you select the deployment based on the id and delete it -> `DELETE /v1/tenants/me/deployments/{deployment_id}`

- Start at the top-level resource (e.g., `/v1/tenants`)
- Drill down to sub-resources (e.g., `/v1/tenants/me/deployments`)
- Access or mutate specific items (e.g., `/v1/tenants/me/deployments/{deployment_id}`)

This approach makes the API intuitive and predictable, mirroring how users explore data in a UI or file system.

### 4. Design for Extensibility

When new sub-resources or details are needed (e.g., more user details, deployment configs), extend the path logically:

- `GET /v1/users/{user_id}/details`
- `PATCH /v1/tenants/me/deployments/{deployment_id}/configs`

## Why do we need this?

A well-designed endpoint structure:

- Makes APIs intuitive for consumers
- Reflects the underlying data model and relationships
- Simplifies permission and access control (e.g., `/me` for current user/tenant)
- Eases future expansion and maintenance

## What should I remember?

- Always start by mapping out entities and their relationships
- Use RESTful, hierarchical, and versioned endpoint paths
- Design endpoints to mirror resource navigation (like a folder structure)
- Use clear, plural resource names
- Prefer explicit, descriptive paths over ambiguous or overloaded endpoints
- Design for extensibility—new sub-resources should fit naturally into the path

> 💡 **Note**: When in doubt, diagram the relationships and walk through the user flows as if navigating a file system. This will help you design endpoints that are both logical and user-friendly.
