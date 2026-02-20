# SigNoz Production - Quick Reference

## 🚀 Access Points
- **Production URL**: https://monitoring.tictuk.net
- **Cluster**: signoz-prod (us-east-2)
- **Namespace**: signoz

## 📊 Current Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                        SigNoz Production                       │
├─────────────────────────────────────────────────────────────────┤
│ CloudFront → ALB → 3x SigNoz Pods → 4x ClickHouse Cluster      │
│                     ↓                                           │
│              3x ZooKeeper (Coordination)                        │
│                     ↓                                           │
│           3x OTel Collectors + Hostmetrics                      │
└─────────────────────────────────────────────────────────────────┘
```

## ⚡ Quick Health Checks

### Overall Status
```bash
kubectl get pods -n signoz
```
Expected: 15+ pods, all Running status

### ClickHouse Cluster
```bash
kubectl exec chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz -- \
  clickhouse-client -q "SELECT cluster, count(*) FROM system.clusters WHERE cluster = 'prod' GROUP BY cluster"
```
Expected: `prod 4`

### Recent Data Flow
```bash
kubectl exec chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz -- \
  clickhouse-client -q "SELECT count(*) FROM signoz_metrics.distributed_samples_v4 WHERE unix_milli > $(date -d '5 minutes ago' +%s)000"
```
Expected: >1000 recent metrics

### External Access
```bash
curl -I https://monitoring.tictuk.net/api/v1/health
```
Expected: `HTTP/2 200`

## 🚨 Critical Issues (Quick Fix)

### ClickHouse Anti-Affinity Conflict (NEW - 2025-07-21)
**Symptoms**: Pods stuck in Pending, 503 errors after upgrade
```bash
# Quick fix
kubectl get chi -n signoz                    # Check for duplicates
kubectl delete chi signoz-clickhouse -n signoz  # Delete new installation
kubectl delete pvc $(kubectl get pvc -n signoz -o name | grep "clickhouse-prod") -n signoz
kubectl patch statefulset signoz -n signoz -p '{"spec":{"template":{"spec":{"containers":[{"name":"signoz","env":[{"name":"CLICKHOUSE_HOST","value":"clickhouse-signoz-clickhouse-ha"}]}]}}}}'
kubectl rollout status statefulset/signoz -n signoz
```

### SigNoz 500 Errors
**Symptoms**: UI not loading, database connection failures
```bash
# Quick diagnosis
kubectl logs signoz-0 -n signoz --tail=5
kubectl get chi -n signoz               # Check for duplicates
kubectl get pods -n signoz | grep signoz-0  # Check main pod status
# Apply fixes from above if ClickHouse issues detected
```

### No Data in SigNoz UI (NEW - 2025-07-21)
**Symptoms**: UI loads but metrics/logs/traces are empty or "No data found"
```bash
# Quick diagnosis
kubectl logs $(kubectl get pods -n signoz | grep otel-collector | awk '{print $1}' | head -1) -n signoz --tail=5

# Quick fix for OTel collector connectivity
kubectl patch deployment signoz-otel-collector -n signoz -p '{"spec":{"template":{"spec":{"containers":[{"name":"collector","env":[{"name":"CLICKHOUSE_HOST","value":"clickhouse-signoz-clickhouse-ha"}]}]}}}}'
kubectl rollout status deployment/signoz-otel-collector -n signoz

# Verify data is flowing (should show >1000)
kubectl exec chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz -- clickhouse-client -q "SELECT count(*) FROM signoz_metrics.distributed_samples_v4 WHERE unix_milli > $(date -d '2 minutes ago' +%s)000"
```

### Schema Migration Failed
**Symptoms**: Missing databases, migration job failures
```bash
# Quick fix
kubectl delete job signoz-schema-migrator-sync -n signoz
kubectl apply -f schema-migration-fixed.yaml
kubectl logs job/signoz-schema-migrator-fixed -n signoz -f
```

## 🔧 Common Operations

### Scale ZooKeeper (if needed)
```bash
kubectl scale statefulset signoz-zookeeper --replicas=3 -n signoz
```

### Check Storage Usage
```bash
kubectl get pvc -n signoz
```

### View Recent Logs
```bash
# SigNoz main service
kubectl logs signoz-0 -n signoz --tail=50

# ClickHouse logs
kubectl logs chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz --tail=50

# OTel collector logs
kubectl logs deployment/signoz-otel-collector -n signoz --tail=50
```

### Infrastructure Metrics Status
```bash
kubectl get pods -n signoz -l app=otel-hostmetrics-collector
```

## 🚨 Emergency Actions

### Delete Stuck Schema Migration
```bash
kubectl delete job signoz-schema-migrator-async-init -n signoz
```

### Restart Component
```bash
# Restart SigNoz main pod
kubectl delete pod signoz-0 -n signoz

# Restart ClickHouse pod (pick one)
kubectl delete pod chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz

# Restart all OTel collectors
kubectl rollout restart deployment/signoz-otel-collector -n signoz
```

### Check Cluster Resources
```bash
kubectl top nodes
kubectl top pods -n signoz
```

## 📋 Component Inventory

### ClickHouse Cluster (4 nodes)
- `chi-signoz-clickhouse-ha-prod-0-0-0` (Shard 1, Replica 1)
- `chi-signoz-clickhouse-ha-prod-0-1-0` (Shard 1, Replica 2)  
- `chi-signoz-clickhouse-ha-prod-1-0-0` (Shard 2, Replica 1)
- `chi-signoz-clickhouse-ha-prod-1-1-0` (Shard 2, Replica 2)

### ZooKeeper Cluster (3 nodes)
- `signoz-zookeeper-0`
- `signoz-zookeeper-1`
- `signoz-zookeeper-2`

### SigNoz Services
- `signoz-0` (Main application)
- `signoz-otel-collector-*` (3 replicas)
- `otel-hostmetrics-collector-*` (DaemonSet on each node)

## 🔍 Troubleshooting Quick Steps

### No Data in UI
1. Check OTel collectors: `kubectl get pods -n signoz | grep otel`
2. Check recent metrics: See "Recent Data Flow" above
3. Check ClickHouse: See "ClickHouse Cluster" above

### External Access Failed
1. Check ingress: `kubectl get ingress signoz-alb-ingress -n signoz`
2. Check ALB: Look for address in ingress status
3. Test direct ALB: `curl -I http://<ALB-HOSTNAME>/api/v1/health`

### Poor Performance
1. Check resources: `kubectl top pods -n signoz`
2. Check storage: `kubectl get pvc -n signoz`
3. Check ClickHouse logs for slow queries

### Schema Issues
1. Check databases: `kubectl exec chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz -- clickhouse-client -q "SHOW DATABASES"`
2. Expected: 5 signoz_* databases
3. Check table count: Should show ~104 tables

## 📁 Configuration Files
- `signoz-ha-values.yaml` - Helm configuration
- `clickhouse-ha-cluster.yaml` - ClickHouse cluster config
- `signoz-alb-ingress.yaml` - Load balancer config
- `otel-hostmetrics-daemonset.yaml` - Infrastructure monitoring
- `schema-migration-fixed.yaml` - Custom migration for distributed setup

## ⚠️ Known Issues
- **K8s Metrics UI**: SigNoz v0.90.1 query builder bug prevents dashboard display
- **Workaround**: Use custom dashboards or direct ClickHouse queries
- **Schema Migrations**: Async jobs may get stuck - safe to delete

---
**Last Updated**: 2025-07-20 23:30 UTC