# Onboarding Configuration Guide

This guide explains how to add new data sources to the SigNoz onboarding flow. The onboarding configuration controls the "New Source" / "Get Started" experience in SigNoz Cloud.

## Configuration File Location

The configuration is located at:

```
frontend/src/container/OnboardingV2Container/onboarding-configs/onboarding-config-with-links.ts
```

## Structure Overview

The configuration file exports a TypeScript array (`onboardingConfigWithLinks`) containing data source objects. Each object represents a selectable option in the onboarding flow. SVG logos are imported as ES modules at the top of the file.

## Data Source Object Keys

### Required Keys

| Key | Type | Description |
|-----|------|-------------|
| `dataSource` | `string` | Unique identifier for the data source (kebab-case, e.g., `"aws-ec2"`) |
| `label` | `string` | Display name shown to users (e.g., `"AWS EC2"`) |
| `tags` | `string[]` | Array of category tags for grouping (e.g., `["AWS"]`, `["database"]`) |
| `module` | `string` | Destination module after onboarding completion |
| `imgUrl` | `string` | Imported SVG URL **(SVG required)** (e.g., `import ec2Url from '@/assets/Logos/ec2.svg'`, then use `ec2Url`) |

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

```ts
question: {
  desc: 'What would you like to monitor?',
  type: 'select',
  helpText: 'Choose the telemetry type you want to collect.',
  helpLink: '/docs/azure-monitoring/overview/',
  helpLinkText: 'Read the guide →',
  options: [
    {
      key: 'logging',
      label: 'Logs',
      imgUrl: azureVmUrl,
      link: '/docs/azure-monitoring/app-service/logging/',
    },
    {
      key: 'metrics',
      label: 'Metrics',
      imgUrl: azureVmUrl,
      link: '/docs/azure-monitoring/app-service/metrics/',
    },
    {
      key: 'tracing',
      label: 'Traces',
      imgUrl: azureVmUrl,
      link: '/docs/azure-monitoring/app-service/tracing/',
    },
  ],
},
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

```ts
{
  key: 'aws-ec2-logs',
  label: 'Logs',
  imgUrl: ec2Url,
  link: '/docs/userguide/collect_logs_from_file/',
},
```

### Option with Internal Redirect

```ts
{
  key: 'aws-ec2-metrics-one-click',
  label: 'One Click AWS',
  imgUrl: ec2Url,
  link: '/integrations?integration=aws-integration&service=ec2',
  internalRedirect: true,
},
```

> **Important**: Set `internalRedirect: true` only for internal app routes (like `/integrations?...`). Docs links should NOT have this flag.

### Nested Option (Multi-step Flow)

```ts
{
  key: 'aws-ec2-metrics',
  label: 'Metrics',
  imgUrl: ec2Url,
  question: {
    desc: 'How would you like to set up monitoring?',
    helpText: 'Choose your setup method.',
    options: [...],
  },
},
```

## Examples

### Simple Data Source (Direct Link)

```ts
import elbUrl from '@/assets/Logos/elb.svg';

// inside the onboardingConfigWithLinks array:
{
  dataSource: 'aws-elb',
  label: 'AWS ELB',
  tags: ['AWS'],
  module: 'logs',
  relatedSearchKeywords: [
    'aws',
    'aws elb',
    'elb logs',
    'elastic load balancer',
  ],
  imgUrl: elbUrl,
  link: '/docs/aws-monitoring/elb/',
},
```

### Data Source with Single Question Level

```ts
import azureVmUrl from '@/assets/Logos/azure-vm.svg';

// inside the onboardingConfigWithLinks array:
{
  dataSource: 'app-service',
  label: 'App Service',
  imgUrl: azureVmUrl,
  tags: ['Azure'],
  module: 'apm',
  relatedSearchKeywords: ['azure', 'app service'],
  question: {
    desc: 'What telemetry data do you want to visualise?',
    type: 'select',
    options: [
      {
        key: 'logging',
        label: 'Logs',
        imgUrl: azureVmUrl,
        link: '/docs/azure-monitoring/app-service/logging/',
      },
      {
        key: 'metrics',
        label: 'Metrics',
        imgUrl: azureVmUrl,
        link: '/docs/azure-monitoring/app-service/metrics/',
      },
      {
        key: 'tracing',
        label: 'Traces',
        imgUrl: azureVmUrl,
        link: '/docs/azure-monitoring/app-service/tracing/',
      },
    ],
  },
},
```

### Data Source with Nested Questions (2-3 Levels)

```ts
import ec2Url from '@/assets/Logos/ec2.svg';

// inside the onboardingConfigWithLinks array:
{
  dataSource: 'aws-ec2',
  label: 'AWS EC2',
  tags: ['AWS'],
  module: 'logs',
  relatedSearchKeywords: ['aws', 'aws ec2', 'ec2 logs', 'ec2 metrics'],
  imgUrl: ec2Url,
  question: {
    desc: 'What would you like to monitor for AWS EC2?',
    type: 'select',
    helpText: 'Choose the type of telemetry data you want to collect.',
    options: [
      {
        key: 'aws-ec2-logs',
        label: 'Logs',
        imgUrl: ec2Url,
        link: '/docs/userguide/collect_logs_from_file/',
      },
      {
        key: 'aws-ec2-metrics',
        label: 'Metrics',
        imgUrl: ec2Url,
        question: {
          desc: 'How would you like to set up EC2 Metrics monitoring?',
          helpText: 'One Click uses AWS CloudWatch integration. Manual setup uses OpenTelemetry.',
          helpLink: '/docs/aws-monitoring/one-click-vs-manual/',
          helpLinkText: 'Read the comparison guide →',
          options: [
            {
              key: 'aws-ec2-metrics-one-click',
              label: 'One Click AWS',
              imgUrl: ec2Url,
              link: '/integrations?integration=aws-integration&service=ec2',
              internalRedirect: true,
            },
            {
              key: 'aws-ec2-metrics-manual',
              label: 'Manual Setup',
              imgUrl: ec2Url,
              link: '/docs/tutorial/opentelemetry-binary-usage-in-virtual-machine/',
            },
          ],
        },
      },
    ],
  },
},
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

- Place logo files in `src/assets/Logos/`
- Use SVG format
- Import the SVG at the top of the file and reference the imported variable:
  ```ts
  import myServiceUrl from '@/assets/Logos/my-service.svg';
  // then in the config object:
  imgUrl: myServiceUrl,
  ```
- **Fetching Icons**: New icons can be easily fetched from [OpenBrand](https://openbrand.sh/). Use the pattern `https://openbrand.sh/?url=<TARGET_URL>`, where `<TARGET_URL>` is the URL-encoded link to the service's website. For example, to get Render's logo, use [https://openbrand.sh/?url=https%3A%2F%2Frender.com](https://openbrand.sh/?url=https%3A%2F%2Frender.com).
- **Optimize new SVGs**: Run any newly downloaded SVGs through an optimizer like [SVGOMG (svgo)](https://svgomg.net/) or use `npx svgo src/assets/Logos/your-logo.svg` to minimise their size before committing.

### 4. Links

- Docs links should start with `/docs/` (will be prefixed with DOCS_BASE_URL)
- Internal app links should start with `/integrations`, `/services`, etc.
- Only use `internalRedirect: true` for internal app routes

### 5. Keys

- Use kebab-case for `dataSource` and option `key` values
- Make keys descriptive and unique
- Follow the pattern: `{service}-{subtype}-{action}` (e.g., `aws-ec2-metrics-one-click`)

## Adding a New Data Source

1. Add the logo SVG to `src/assets/Logos/` and add a top-level import in the config file (e.g., `import myServiceUrl from '@/assets/Logos/my-service.svg'`)
2. Add your data source object to the `onboardingConfigWithLinks` array, referencing the imported variable for `imgUrl`
3. Test the flow locally with `yarn dev`
4. Validation:
   - Navigate to the [onboarding page](http://localhost:3301/get-started-with-signoz-cloud) on your local machine
   - Data source appears in the list
   - Search keywords work correctly
   - All links redirect to the correct pages
   - Questions display correct help text and links
   - Tags are used for grouping in the UI sidebar
   - Clicking on Configure redirects to the correct page
