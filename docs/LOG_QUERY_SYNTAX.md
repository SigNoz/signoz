# SigNoz Log Query Syntax Guide

> A practical guide for SREs and DevOps engineers to search and filter logs in SigNoz.

## Table of Contents

- [Overview](#overview)
- [Basic Log Filtering](#basic-log-filtering)
- [Query Operators](#query-operators)
- [Regular Expression Queries](#regular-expression-queries)
- [Timestamp Filtering](#timestamp-filtering)
- [Combined Filter Examples](#combined-filter-examples)
- [Real-World SRE Use Cases](#real-world-sre-use-cases)
- [Tips and Best Practices](#tips-and-best-practices)

---

## Overview

SigNoz uses a LogQL-like query syntax for searching and filtering logs. Understanding this syntax will help you quickly find the logs you need during incidents, debugging sessions, or routine monitoring.

### Quick Example

```
severity IN ('error', 'critical') AND service_name CONTAINS 'payment'
```

This query finds all logs with severity level `error` or `critical` from services containing `payment` in their name.

---

## Basic Log Filtering

### Full-Text Search

The simplest way to search logs is by entering a keyword directly. This performs a full-text search across all log content.

```
database connection failed
```

**When to use:** When you're not sure which field contains the information you need.

### Searching by Field

Filter logs by specific fields using the `key operator value` format:

```
service_name CONTAINS 'user-service'
```

```
severity GTE 400
```

```
http_method IN ('POST', 'PUT')
```

### Common Log Fields

Here are fields you'll commonly filter by:

| Field | Description | Example Value |
|-------|-------------|---------------|
| `timestamp` | Log timestamp | `2024-01-15T10:30:00Z` |
| `severity` | Log level | `error`, `warn`, `info`, `debug` |
| `service_name` | Name of the service | `payment-service` |
| `trace_id` | Distributed trace ID | `abc123def456` |
| `span_id` | Span ID within a trace | `span789` |
| `http_method` | HTTP method | `GET`, `POST` |
| `http_status_code` | HTTP response code | `200`, `500` |
| `host` | Hostname or IP | `prod-web-01` |

---

## Query Operators

### String Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `CONTAINS` | Value contains substring | `message CONTAINS 'timeout'` |
| `NCONTAINS` | Value does NOT contain substring | `message NCONTAINS 'healthcheck'` |
| `IN` | Value is in a list | `severity IN ('error', 'fatal')` |
| `NIN` | Value is NOT in a list | `level NIN ('debug', 'trace')` |

### Numeric Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `GT` | Greater than | `response_time GT 1000` |
| `GTE` | Greater than or equal | `http_status_code GTE 400` |
| `LT` | Less than | `duration_ms LT 500` |
| `LTE` | Less than or equal | `retry_count LTE 3` |

### Logical Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `AND` | Both conditions must be true | `severity CONTAINS 'error' AND service_name CONTAINS 'api'` |
| `OR` | At least one condition must be true | `severity CONTAINS 'error' OR severity CONTAINS 'fatal'` |

---

## Regular Expression Queries

### Basic Regex Filtering

SigNoz supports regex patterns in string-based queries. Use regex when you need flexible pattern matching.

```
message CONTAINS 'error.*timeout'
```

```
request_path CONTAINS '/api/v[0-9]+/users'
```

### Common Regex Patterns for SREs

#### IP Address Matching

```
message CONTAINS '\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}'
```

Find logs containing IPv4 addresses (e.g., error logs with client IPs).

#### UUID Matching

```
message CONTAINS '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
```

Find logs containing UUIDs (useful for tracking specific request IDs).

#### Error Code Patterns

```
message CONTAINS 'ERR_[0-9]{4}'
```

Find custom error codes like `ERR_5001`, `ERR_4040`.

#### Stack Trace Detection

```
message CONTAINS 'at\\s+[a-zA-Z0-9_.]+\\.[a-zA-Z0-9_]+\\s*\\('
```

Find logs containing Java-style stack traces.

### Regex Tips

- **Escape backslashes**: Use `\\` instead of `\` in regex patterns
- **Case sensitivity**: Queries are case-insensitive by default
- **Performance**: Simple `CONTAINS` is faster than complex regex patterns

---

## Timestamp Filtering

### Time Range in UI

While SigNoz provides a time picker in the UI, you can also include time ranges in your saved queries and alerts.

### Relative Time Expressions

When using the SigNoz API, you can specify relative timestamps:

```
# Last 5 minutes
start_time: now-5m
end_time: now

# Last 1 hour
start_time: now-1h
end_time: now

# Last 24 hours
start_time: now-24h
end_time: now
```

### Timestamp Filtering in Queries

For timestamp-based filtering within the query builder:

```
# Note: Time range is typically controlled via the UI time picker
# The examples below work when timestamp is stored as a numeric field

timestamp GTE 1705312800000 AND timestamp LTE 1705316400000
```

**Pro Tip:** Use the UI time picker for most use cases. It's faster and handles timezone conversion automatically.

---

## Combined Filter Examples

### Finding 5xx Errors by Service

```
http_status_code GTE 500 AND service_name CONTAINS 'payment-service'
```

Find all server errors (5xx) from the payment service.

### Excluding Health Checks

```
message NCONTAINS 'healthcheck' AND message NCONTAINS '/health'
```

Filter out noisy health check logs to focus on real traffic.

### Multi-Service Error Search

```
severity IN ('error', 'critical', 'fatal') AND service_name IN ('api-gateway', 'auth-service', 'billing')
```

Find errors across multiple critical services.

### Specific Error Patterns

```
message CONTAINS 'Connection refused' OR message CONTAINS 'Connection timeout' OR message CONTAINS 'ECONNREFUSED'
```

Find connection-related errors (covers different error message formats).

### User-Specific Log Search

```
user_id CONTAINS 'user_12345' AND severity CONTAINS 'error'
```

Find error logs for a specific user (useful during customer support escalation).

### API Endpoint Performance Issues

```
http_method CONTAINS 'POST' AND request_path CONTAINS '/api/v2/checkout' AND response_time GT 5000
```

Find slow checkout API calls taking more than 5 seconds.

### Excluding Known Issues

```
severity CONTAINS 'error' AND message NCONTAINS 'DeprecationWarning' AND message NCONTAINS 'experimental'
```

Find real errors while filtering out known deprecation warnings.

---

## Real-World SRE Use Cases

### 1. Incident Response: Finding Root Cause

**Scenario:** Users report payment failures. Find related logs quickly.

```
(severity IN ('error', 'critical') AND service_name CONTAINS 'payment') 
OR 
(http_status_code GTE 500 AND request_path CONTAINS '/payment')
```

**Why this works:** Catches both application errors and HTTP failures.

### 2. Capacity Planning: High Resource Usage

```
message CONTAINS 'memory' AND (message CONTAINS 'exceeded' OR message CONTAINS 'threshold')
```

Find logs indicating memory pressure or threshold breaches.

### 3. Security Audit: Suspicious Activity

```
(http_status_code GTE 400 AND request_path CONTAINS '/admin') 
OR 
message CONTAINS 'unauthorized' OR message CONTAINS 'authentication failed'
```

Detect potential security issues or unauthorized access attempts.

### 4. Deployment Verification

```
version CONTAINS 'v2.5.0' AND severity IN ('error', 'fatal')
```

Check for errors after deploying a new version.

### 5. Database Performance Issues

```
(message CONTAINS 'slow query' OR message CONTAINS 'query_time') AND duration_ms GT 1000
```

Find slow database queries taking more than 1 second.

### 6. Third-Party Integration Failures

```
service_name CONTAINS 'webhook' AND (severity CONTAINS 'error' OR http_status_code GTE 400)
```

Monitor failures in third-party webhook integrations.

### 7. Queue/Disk Space Alerts

```
message CONTAINS 'queue' AND (message CONTAINS 'full' OR message CONTAINS 'overflow' OR message CONTAINS 'depth')
```

Detect queue-related issues before they cause system failures.

---

## Tips and Best Practices

### 1. Start Broad, Then Narrow

Begin with a simple search, then add filters:

```
# Step 1: Search for errors
severity CONTAINS 'error'

# Step 2: Narrow to specific service
severity CONTAINS 'error' AND service_name CONTAINS 'api'

# Step 3: Focus on specific error type
severity CONTAINS 'error' AND service_name CONTAINS 'api' AND message CONTAINS 'timeout'
```

### 2. Use `IN` for Multiple Values

Instead of multiple `OR` conditions:

```
# Good
severity IN ('error', 'critical', 'fatal')

# Avoid
severity CONTAINS 'error' OR severity CONTAINS 'critical' OR severity CONTAINS 'fatal'
```

### 3. Exclude Noise Early

Health checks and monitoring pings can clutter your results:

```
message NCONTAINS '/health' AND message NCONTAINS 'healthcheck' AND user_agent NCONTAINS 'monitoring'
```

### 4. Group Related Conditions

Use parentheses for complex queries:

```
(severity CONTAINS 'error' OR severity CONTAINS 'critical') 
AND 
(service_name CONTAINS 'payment' OR service_name CONTAINS 'billing')
```

### 5. Save Common Queries

Save frequently used queries as dashboards or alerts:

- **Error Rate Monitoring:** `severity CONTAINS 'error'`
- **Payment Service Health:** `service_name CONTAINS 'payment' AND severity GTE 400`
- **Security Audit:** `message CONTAINS 'unauthorized' OR message CONTAINS 'forbidden'`

### 6. Query Performance

- **Prefer exact matches over regex:** `service_name CONTAINS 'api'` is faster than `service_name CONTAINS 'a.*i'`
- **Use indexed fields:** `timestamp`, `severity`, and `service_name` are typically indexed
- **Limit time ranges:** Shorter time ranges return results faster

### 7. Field Existence Checks

To find logs where a field exists:

```
trace_id CONTAINS ''
```

This finds all logs that have a `trace_id` field (useful for finding traces).

---

## Troubleshooting Common Issues

### Query Returns No Results

1. Check the time range - logs might be outside the selected window
2. Verify field names - they must match exactly (case-sensitive)
3. Try a simpler query first, then add filters
4. Check if the field exists in your log schema

### Too Many Results

1. Narrow the time range
2. Add more specific filters
3. Exclude known noise (health checks, debug logs)
4. Use `AND` instead of `OR` to require multiple conditions

### Slow Query Performance

1. Reduce the time range
2. Use indexed fields in your query
3. Avoid regex when possible
4. Use `CONTAINS` instead of full-text search

---

## Additional Resources

- [SigNoz Documentation](https://signoz.io/docs/)
- [Log Management in SigNoz](https://signoz.io/log-management/)
- [OpenTelemetry Log Collection](https://signoz.io/docs/instrumentation/)

---

*Happy logging! If you find this guide helpful or have suggestions for improvement, feel free to contribute to the SigNoz project.*

**Contributed by:** Alex Chen, Site Reliability Engineer  
**Last Updated:** April 2024
