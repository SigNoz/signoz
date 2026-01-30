# Onboarding Configuration Guide

This guide explains how to add new data sources to the SigNoz onboarding flow. The onboarding configuration controls the "New Source" / "Get Started" experience in SigNoz Cloud.

## Configuration File Location

The configuration is located at:

```
frontend/src/container/OnboardingV2Container/onboarding-configs/onboarding-config-with-links.json
```

## JSON Structure Overview

The configuration file is a JSON array containing data source objects. Each object represents a selectable option in the onboarding flow.

## Data Source Object Keys

### Required Keys

| Key | Type | Description |
|-----|------|-------------|
| `dataSource` | `string` | Unique identifier for the data source (kebab-case, e.g., `"aws-ec2"`) |
| `label` | `string` | Display name shown to users (e.g., `"AWS EC2"`) |
| `tags` | `string[]` | Array of category tags for grouping (e.g., `["AWS"]`, `["database"]`) |
| `module` | `string` | Destination module after onboarding completion |
| `imgUrl` | `string` | Path to the logo/icon **(SVG required)** (e.g., `"/Logos/ec2.svg"`) |

### Optional Keys

| Key | Type | Description |
|-----|------|-------------|
| `link` | `string` | Docs link to redirect to (e.g., `"/docs/aws-monitoring/ec2/"`) |
| `relatedSearchKeywords` | `string[]` | Array of keywords for search functionality |
| `question` | `object` | Nested question object for multi-step flows |
| `internalRedirect` | `boolean` | When `true`, navigates within the app instead of showing docs |

## Module Values

The `module` key determines where users are redirected after completing onboarding:

| Value | Destination |
|-------|-------------|
| `apm` | APM / Traces |
| `logs` | Logs Explorer |
| `metrics` | Metrics Explorer |
| `dashboards` | Dashboards |
| `infra-monitoring-hosts` | Infrastructure Monitoring - Hosts |
| `infra-monitoring-k8s` | Infrastructure Monitoring - Kubernetes |
| `messaging-queues-kafka` | Messaging Queues - Kafka |
| `messaging-queues-celery` | Messaging Queues - Celery |
| `integrations` | Integrations page |
| `home` | Home page |
| `api-monitoring` | API Monitoring |

## Question Object Structure

The `question` object enables multi-step selection flows:

```json
{
  "question": {
    "desc": "What would you like to monitor?",
    "type": "select",
    "helpText": "Choose the telemetry type you want to collect.",
    "helpLink": "/docs/azure-monitoring/overview/",
    "helpLinkText": "Read the guide →",
    "options": [
        {
            "key": "logging",
            "label": "Logs",
            "imgUrl": "/Logos/azure-vm.svg",
            "link": "/docs/azure-monitoring/app-service/logging/"
        },
        {
            "key": "metrics",
            "label": "Metrics",
            "imgUrl": "/Logos/azure-vm.svg",
            "link": "/docs/azure-monitoring/app-service/metrics/"
        },
        {
            "key": "tracing",
            "label": "Traces",
            "imgUrl": "/Logos/azure-vm.svg",
            "link": "/docs/azure-monitoring/app-service/tracing/"
        }
    ]
  }
}
```

### Question Keys

| Key | Type | Description |
|-----|------|-------------|
| `desc` | `string` | Question text displayed to the user |
| `type` | `string` | Currently only `"select"` is supported |
| `helpText` | `string` | (Optional) Additional help text below the question |
| `helpLink` | `string` | (Optional) Docs link for the help section |
| `helpLinkText` | `string` | (Optional) Text for the help link (default: "Learn more →") |
| `options` | `array` | Array of option objects |

## Option Object Structure

Options can be simple (direct link) or nested (with another question):

### Simple Option (Direct Link)

```json
{
  "key": "aws-ec2-logs",
  "label": "Logs",
  "imgUrl": "/Logos/ec2.svg",
  "link": "/docs/userguide/collect_logs_from_file/"
}
```

### Option with Internal Redirect

```json
{
  "key": "aws-ec2-metrics-one-click",
  "label": "One Click AWS",
  "imgUrl": "/Logos/ec2.svg",
  "link": "/integrations?integration=aws-integration&service=ec2",
  "internalRedirect": true
}
```

> **Important**: Set `internalRedirect: true` only for internal app routes (like `/integrations?...`). Docs links should NOT have this flag.

### Nested Option (Multi-step Flow)

```json
{
  "key": "aws-ec2-metrics",
  "label": "Metrics",
  "imgUrl": "/Logos/ec2.svg",
  "question": {
    "desc": "How would you like to set up monitoring?",
    "helpText": "Choose your setup method.",
    "options": [...]
  }
}
```

## Examples

### Simple Data Source (Direct Link)

```json
{
  "dataSource": "aws-elb",
  "label": "AWS ELB",
  "tags": ["AWS"],
  "module": "logs",
  "relatedSearchKeywords": [
    "aws",
    "aws elb",
    "elb logs",
    "elastic load balancer"
  ],
  "imgUrl": "/Logos/elb.svg",
  "link": "/docs/aws-monitoring/elb/"
}
```

### Data Source with Single Question Level

```json
{
  "dataSource": "app-service",
  "label": "App Service",
  "imgUrl": "/Logos/azure-vm.svg",
  "tags": ["Azure"],
  "module": "apm",
  "relatedSearchKeywords": ["azure", "app service"],
  "question": {
    "desc": "What telemetry data do you want to visualise?",
    "type": "select",
    "options": [
      {
        "key": "logging",
        "label": "Logs",
        "imgUrl": "/Logos/azure-vm.svg",
        "link": "/docs/azure-monitoring/app-service/logging/"
      },
      {
        "key": "metrics",
        "label": "Metrics",
        "imgUrl": "/Logos/azure-vm.svg",
        "link": "/docs/azure-monitoring/app-service/metrics/"
      },
      {
        "key": "tracing",
        "label": "Traces",
        "imgUrl": "/Logos/azure-vm.svg",
        "link": "/docs/azure-monitoring/app-service/tracing/"
      }
    ]
  }
}
```

### Data Source with Nested Questions (2-3 Levels)

```json
{
  "dataSource": "aws-ec2",
  "label": "AWS EC2",
  "tags": ["AWS"],
  "module": "logs",
  "relatedSearchKeywords": ["aws", "aws ec2", "ec2 logs", "ec2 metrics"],
  "imgUrl": "/Logos/ec2.svg",
  "question": {
    "desc": "What would you like to monitor for AWS EC2?",
    "type": "select",
    "helpText": "Choose the type of telemetry data you want to collect.",
    "options": [
      {
        "key": "aws-ec2-logs",
        "label": "Logs",
        "imgUrl": "/Logos/ec2.svg",
        "link": "/docs/userguide/collect_logs_from_file/"
      },
      {
        "key": "aws-ec2-metrics",
        "label": "Metrics",
        "imgUrl": "/Logos/ec2.svg",
        "question": {
          "desc": "How would you like to set up EC2 Metrics monitoring?",
          "helpText": "One Click uses AWS CloudWatch integration. Manual setup uses OpenTelemetry.",
          "helpLink": "/docs/aws-monitoring/one-click-vs-manual/",
          "helpLinkText": "Read the comparison guide →",
          "options": [
            {
              "key": "aws-ec2-metrics-one-click",
              "label": "One Click AWS",
              "imgUrl": "/Logos/ec2.svg",
              "link": "/integrations?integration=aws-integration&service=ec2",
              "internalRedirect": true
            },
            {
              "key": "aws-ec2-metrics-manual",
              "label": "Manual Setup",
              "imgUrl": "/Logos/ec2.svg",
              "link": "/docs/tutorial/opentelemetry-binary-usage-in-virtual-machine/"
            }
          ]
        }
      }
    ]
  }
}
```

## Best Practices

### 1. Tags

- Use existing tags when possible: `AWS`, `Azure`, `GCP`, `database`, `logs`, `apm/traces`, `infrastructure monitoring`, `LLM Monitoring`
- Tags are used for grouping in the sidebar
- Every data source must have at least one tag

### 2. Search Keywords

- Include variations of the name (e.g., `"aws ec2"`, `"ec2"`, `"ec2 logs"`)
- Include common misspellings or alternative names
- Keep keywords lowercase and alphabetically sorted

### 3. Logos

- Place logo files in `public/Logos/`
- Use SVG format
- Reference as `"/Logos/your-logo.svg"`

### 4. Links

- Docs links should start with `/docs/` (will be prefixed with DOCS_BASE_URL)
- Internal app links should start with `/integrations`, `/services`, etc.
- Only use `internalRedirect: true` for internal app routes

### 5. Keys

- Use kebab-case for `dataSource` and option `key` values
- Make keys descriptive and unique
- Follow the pattern: `{service}-{subtype}-{action}` (e.g., `aws-ec2-metrics-one-click`)

## Adding a New Data Source

1. Add your data source object to the JSON array
2. Ensure the logo exists in `public/Logos/`
3. Test the flow locally with `yarn dev`
4. Validation:
   - Navigate to the [onboarding page](http://localhost:3301/get-started-with-signoz-cloud) on your local machine
   - Data source appears in the list
   - Search keywords work correctly
   - All links redirect to the correct pages
   - Questions display correct help text and links
   - Tags are used for grouping in the UI sidebar
   - Clicking on Configure redirects to the correct page
