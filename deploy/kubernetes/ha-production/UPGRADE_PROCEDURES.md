# SigNoz Upgrade Procedures and Future Considerations

## Critical Issues for Future Upgrades

### 1. Schema Migration Override Issue (HIGH PRIORITY)

**Problem**: The SigNoz Helm chart hardcodes schema migration environment variables to single-node values:
```yaml
env:
  CLICKHOUSE_SHARDS: 1
  CLICKHOUSE_REPLICAS: 1
```

**Our Distributed Setup Requires**:
```yaml
env:
  CLICKHOUSE_SHARDS: 2
  CLICKHOUSE_REPLICAS: 2
  CLICKHOUSE_CLUSTER: "prod"
```

**Impact**: Every Helm upgrade will break schema migration and cause 500 errors.

**Preventive Actions**:
1. **Always backup before upgrades**
2. **Test in staging first**
3. **Have the custom schema migration job ready** (`schema-migration-fixed.yaml`)
4. **Monitor for hardcoded values in new chart versions**

### 2. Upgrade Checklist

#### Pre-Upgrade (MANDATORY)
```bash
# 1. Backup current configuration
helm get values signoz -n signoz > signoz-values-backup-$(date +%Y%m%d).yaml
kubectl get all,pvc,configmap,secret -n signoz -o yaml > signoz-k8s-backup-$(date +%Y%m%d).yaml

# 2. Check current versions and configurations
helm list -n signoz
kubectl get pods -n signoz -o wide
kubectl get chi -n signoz  # Check ClickHouse installations

# 3. Verify cluster health and identify service configurations
kubectl get pods -n signoz | grep -v Running | grep -v Completed
kubectl exec chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz -- clickhouse-client -q "SELECT * FROM system.clusters WHERE cluster = 'prod'"
kubectl get svc -n signoz | grep clickhouse  # Important: Note active ClickHouse service names

# 4. Test current functionality
ALB_HOST=$(kubectl get ingress signoz-alb-ingress -n signoz -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
curl http://$ALB_HOST/api/v1/health

# 5. CRITICAL: Document current ClickHouse service configuration
echo "Current ClickHouse service name:" $(kubectl get statefulset signoz -n signoz -o jsonpath='{.spec.template.spec.containers[0].env[?(@.name=="CLICKHOUSE_HOST")].value}')
```

#### Upgrade Process
```bash
# 1. Update Helm repositories
helm repo update signoz

# 2. Check new chart version
helm search repo signoz/signoz --versions

# 3. Download new chart values template
helm show values signoz/signoz > signoz-new-values-template.yaml

# 4. Compare with our values (CRITICAL STEP)
diff signoz-ha-values.yaml signoz-new-values-template.yaml

# 5. Perform dry-run upgrade
helm upgrade signoz signoz/signoz -n signoz -f signoz-ha-values.yaml --dry-run

# 6. Execute upgrade (with shorter timeout to catch issues early)
helm upgrade signoz signoz/signoz -n signoz -f signoz-ha-values.yaml --wait --timeout=10m
```

#### Post-Upgrade Verification
```bash
# 1. Check for schema migration issues
kubectl get jobs -n signoz | grep schema

# 2. CRITICAL: Check for duplicate ClickHouse installations (NEW in 2025-07-21)
kubectl get chi -n signoz
# If you see multiple ClickHouse installations (e.g., signoz-clickhouse AND signoz-clickhouse-ha),
# this indicates a duplicate installation that will cause pod anti-affinity conflicts

# 3. Check for pod scheduling conflicts
kubectl get pods -n signoz | grep -E "(Pending|Failed)"
kubectl describe pod $(kubectl get pods -n signoz | grep Pending | awk '{print $1}' | head -1) -n signoz

# 4. If migration job exists and fails, apply our fix
kubectl delete job signoz-schema-migrator-sync -n signoz --ignore-not-found=true
kubectl apply -f schema-migration-fixed.yaml

# 5. CRITICAL: If you see anti-affinity scheduling conflicts, follow resolution steps below
# (See "ClickHouse Anti-Affinity Conflict Resolution" section)

# 6. Wait for migration completion
kubectl wait --for=condition=complete job/signoz-schema-migrator-fixed -n signoz --timeout=600s

# 7. Verify databases exist
kubectl exec chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz -- clickhouse-client -q "SHOW DATABASES"

# 8. Check SigNoz service connectivity
kubectl get pods -n signoz | grep signoz-0
# If signoz-0 shows 0/1 Running, check service configuration (see resolution steps)

# 9. CRITICAL: Check OTel collector connectivity (NEW in 2025-07-21)
kubectl logs $(kubectl get pods -n signoz | grep otel-collector | awk '{print $1}' | head -1) -n signoz --tail=5
# If you see "lookup signoz-clickhouse...no such host", OTel collectors need service name fix

# 10. Test application functionality
curl http://$ALB_HOST/api/v1/health
curl http://$ALB_HOST/api/v1/settings

# 11. CRITICAL: Verify data ingestion is working (NEW in 2025-07-21)
kubectl exec chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz -- \
  clickhouse-client -q "SELECT count(*) FROM signoz_metrics.distributed_samples_v4 WHERE unix_milli > $(date -d '2 minutes ago' +%s)000"
# Should show >1000 recent metrics if collectors are working
```

## ClickHouse Anti-Affinity Conflict Resolution (CRITICAL - NEW in 2025-07-21)

### Problem Overview
SigNoz Helm upgrades may create **duplicate ClickHouse installations** with conflicting pod anti-affinity rules, causing new pods to be stuck in `Pending` state with the error:
```
0/3 nodes are available: 1 node(s) didn't match pod anti-affinity rules, 2 node(s) didn't satisfy existing pods anti-affinity rules
```

### Root Cause
1. **New installation** (e.g., `signoz-clickhouse`) conflicts with **existing installation** (e.g., `signoz-clickhouse-ha`)
2. **Anti-affinity rules** require ClickHouse pods to be on different nodes (topologyKey: `kubernetes.io/hostname`)
3. **Limited node count** (3 nodes) vs **required pods** (4 from existing + 4 from new = 8 total)
4. **Scheduler cannot satisfy** anti-affinity constraints for all pods

### Immediate Resolution Steps

#### Step 1: Identify Conflicting Installations
```bash
# Check for multiple ClickHouse installations
kubectl get chi -n signoz

# Expected output showing conflict:
# NAME                    STATUS      HOSTS   AGE
# signoz-clickhouse       Pending     0       4h    # NEW (conflicting)
# signoz-clickhouse-ha    Completed   4       25h   # EXISTING (working)
```

#### Step 2: Identify Pending Pods
```bash
# Check pod status
kubectl get pods -n signoz | grep clickhouse

# Look for pods like:
# chi-signoz-clickhouse-prod-0-0-0    0/1  Pending  # From new installation
# chi-signoz-clickhouse-ha-prod-0-0-0  1/1  Running  # From existing installation
```

#### Step 3: Remove Conflicting Installation
```bash
# SAFE: Delete the new/conflicting installation (keeps your data)
kubectl delete chi signoz-clickhouse -n signoz

# This deletes:
# - ClickHouse Custom Resource
# - Pending pods
# - Associated ConfigMaps
# - Does NOT delete PVCs (your data is safe in the -ha installation)
```

#### Step 4: Clean Up Orphaned PVCs
```bash
# Check for orphaned PVCs from deleted installation
kubectl get pvc -n signoz | grep "Pending\|clickhouse-prod"

# Example output:
# data-volumeclaim-template-chi-signoz-clickhouse-prod-0-0-0  Pending

# SAFE: Delete orphaned PVCs (they were never used, contain no data)
kubectl delete pvc $(kubectl get pvc -n signoz -o name | grep "clickhouse-prod") -n signoz
```

#### Step 5: Fix SigNoz Service Configuration
After deleting the conflicting installation, SigNoz may be trying to connect to the wrong ClickHouse service.

```bash
# Check current SigNoz ClickHouse configuration
kubectl get statefulset signoz -n signoz -o jsonpath='{.spec.template.spec.containers[0].env[?(@.name=="CLICKHOUSE_HOST")].value}'

# If it shows "signoz-clickhouse" but the working service is "clickhouse-signoz-clickhouse-ha":
kubectl patch statefulset signoz -n signoz -p '{"spec":{"template":{"spec":{"initContainers":[{"name":"signoz-init","command":["sh","-c","until wget --user \"${CLICKHOUSE_USER}:${CLICKHOUSE_PASSWORD}\" --spider -q clickhouse-signoz-clickhouse-ha:8123/ping; do echo -e \"waiting for clickhouseDB\"; sleep 5; done; echo -e \"clickhouse ready, starting query service now\";"]}],"containers":[{"name":"signoz","env":[{"name":"CLICKHOUSE_HOST","value":"clickhouse-signoz-clickhouse-ha"},{"name":"CLICKHOUSE_PORT","value":"9000"},{"name":"CLICKHOUSE_HTTP_PORT","value":"8123"},{"name":"CLICKHOUSE_CLUSTER","value":"prod"},{"name":"CLICKHOUSE_USER","value":"admin"},{"name":"CLICKHOUSE_PASSWORD","value":"27ff0399-0d3a-4bd8-919d-17c2181e6fb9"},{"name":"CLICKHOUSE_SECURE","value":"false"},{"name":"STORAGE","value":"clickhouse"},{"name":"ClickHouseUrl","value":"tcp://clickhouse-signoz-clickhouse-ha:9000/?username=admin&password=27ff0399-0d3a-4bd8-919d-17c2181e6fb9"},{"name":"GODEBUG","value":"netdns=go"},{"name":"TELEMETRY_ENABLED","value":"true"},{"name":"DEPLOYMENT_TYPE","value":"kubernetes-helm"},{"name":"SIGNOZ_ALERTMANAGER_PROVIDER","value":"signoz"},{"name":"DOT_METRICS_ENABLED","value":"true"}]}]}}}}'

# Wait for rollout to complete
kubectl rollout status statefulset/signoz -n signoz --timeout=300s
```

#### Step 5.5: Fix Service Configuration Using Helm Values (PREFERRED - 2025-07-21)
**BEST PRACTICE**: Instead of manual patching, the correct service configuration is now built into the Helm values.

```bash
# Check if services are failing to connect
kubectl logs signoz-0 -n signoz --tail=5
kubectl logs $(kubectl get pods -n signoz | grep otel-collector | awk '{print $1}' | head -1) -n signoz --tail=5

# PREFERRED: Re-apply Helm upgrade with correct values (permanent fix)
# The signoz-ha-values.yaml now contains the correct ClickHouse service configuration
helm upgrade signoz signoz/signoz -n signoz -f signoz-ha-values.yaml --wait --timeout=10m

# This automatically fixes both SigNoz main service AND OTel collectors
```

#### Step 5.5 Alternative: Manual Patching (EMERGENCY ONLY)
**Only use this if Helm upgrade fails and you need immediate fix**:

```bash
# Manual patch for SigNoz main service
kubectl patch statefulset signoz -n signoz -p '{"spec":{"template":{"spec":{"containers":[{"name":"signoz","env":[{"name":"CLICKHOUSE_HOST","value":"clickhouse-signoz-clickhouse-ha"}]}]}}}}'

# Manual patch for OTel collectors  
kubectl patch deployment signoz-otel-collector -n signoz -p '{"spec":{"template":{"spec":{"containers":[{"name":"collector","env":[{"name":"CLICKHOUSE_HOST","value":"clickhouse-signoz-clickhouse-ha"}]}]}}}}'

# Wait for rollouts
kubectl rollout status statefulset/signoz -n signoz --timeout=300s
kubectl rollout status deployment/signoz-otel-collector -n signoz --timeout=300s
```

#### Step 6: Verify Resolution
```bash
# 1. Check no pending ClickHouse pods
kubectl get pods -n signoz | grep clickhouse
# All should show "Running"

# 2. Check SigNoz pod is ready
kubectl get pods -n signoz | grep signoz-0
# Should show "1/1 Running"

# 3. Test application health
ALB_HOST=$(kubectl get ingress signoz-alb-ingress -n signoz -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
curl http://$ALB_HOST/api/v1/health
# Should return: {"status":"ok"}

# 4. CRITICAL: Verify data ingestion is working (NEW in 2025-07-21)
kubectl exec chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz -- \
  clickhouse-client -q "SELECT count(*) FROM signoz_metrics.distributed_samples_v4 WHERE unix_milli > $(date -d '2 minutes ago' +%s)000"
# Should show >1000 recent metrics

# 5. Check OTel collector logs for errors
kubectl logs $(kubectl get pods -n signoz | grep otel-collector | awk '{print $1}' | head -1) -n signoz --tail=5
# Should show no "no such host" errors
```

### Prevention for Future Upgrades (UPDATED - 2025-07-21)

#### BEST PRACTICE: Use Helm Values Instead of Manual Patching
**The correct ClickHouse service configuration is now permanently set in `signoz-ha-values.yaml`:**

```yaml
# SigNoz main service configuration
signoz:
  additionalEnvs:
    CLICKHOUSE_HOST:
      value: "clickhouse-signoz-clickhouse-ha"

# OtelCollector configuration  
otelCollector:
  additionalEnvs:
    CLICKHOUSE_HOST:
      value: "clickhouse-signoz-clickhouse-ha"
```

**This prevents the need for manual patching after every upgrade.**

#### Pre-Upgrade Checklist Addition
```bash
# Before every upgrade, check cluster capacity
kubectl get nodes
NODE_COUNT=$(kubectl get nodes --no-headers | wc -l)
echo "Node count: $NODE_COUNT"

# Calculate anti-affinity requirements
CLICKHOUSE_PODS=$(kubectl get pods -n signoz -l app.kubernetes.io/name=clickhouse --no-headers | wc -l)
echo "Current ClickHouse pods: $CLICKHOUSE_PODS"
echo "Nodes required for anti-affinity: $CLICKHOUSE_PODS"

# WARNING: If upgrade creates duplicate installation, you'll need $CLICKHOUSE_PODS × 2 nodes
if [ $NODE_COUNT -lt $((CLICKHOUSE_PODS * 2)) ]; then
  echo "WARNING: Insufficient nodes for potential duplicate installation"
  echo "Be prepared to delete duplicate ClickHouse installations immediately after upgrade"
fi
```

#### Helm Values Monitoring
```bash
# Always check if Helm chart introduces new ClickHouse configurations
helm show values signoz/signoz | grep -A 20 -B 5 clickhouse
helm diff upgrade signoz signoz/signoz -n signoz -f signoz-ha-values.yaml
```

### Emergency Recovery
If you accidentally delete the wrong ClickHouse installation:

```bash
# 1. Check what PVCs still exist
kubectl get pvc -n signoz | grep clickhouse

# 2. If your data PVCs exist (chi-signoz-clickhouse-ha-*), redeploy
kubectl apply -f clickhouse-ha-cluster.yaml

# 3. If needed, restore from backup
# [Your backup restoration procedures here]
```

## ClickHouse Upgrade Considerations

### Current Setup
- **Version**: 24.1.2-alpine
- **Cluster**: 2 shards, 2 replicas (4 pods total)
- **Storage**: 1TB per pod, gp3 storage class

### Upgrade Strategy

#### Minor Version Upgrades (24.1.x → 24.2.x)
```bash
# 1. Check compatibility
# Visit: https://signoz.io/docs/install/troubleshooting/

# 2. Rolling upgrade approach
kubectl patch clickhouseinstallation signoz-clickhouse-ha -n signoz --type='merge' -p='{"spec":{"templates":{"podTemplates":[{"name":"clickhouse-pod-template","spec":{"containers":[{"name":"clickhouse","image":"docker.io/clickhouse/clickhouse-server:24.2.1-alpine"}]}}]}}}'

# 3. Monitor rollout
kubectl rollout status statefulset chi-signoz-clickhouse-ha-prod-0-0 -n signoz
kubectl rollout status statefulset chi-signoz-clickhouse-ha-prod-0-1 -n signoz
kubectl rollout status statefulset chi-signoz-clickhouse-ha-prod-1-0 -n signoz
kubectl rollout status statefulset chi-signoz-clickhouse-ha-prod-1-1 -n signoz
```

#### Major Version Upgrades (24.x → 25.x)
**⚠️ CAUTION**: Major version upgrades require more careful planning.

1. **Pre-upgrade testing**:
   ```bash
   # Test in staging environment first
   # Check for breaking changes in ClickHouse release notes
   # Verify SigNoz compatibility matrix
   ```

2. **Data backup**:
   ```bash
   # Create full backup before major upgrades
   kubectl exec chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz -- \
     clickhouse-client -q "BACKUP DATABASE signoz_traces TO S3('s3://your-backup-bucket/signoz-backup-$(date +%Y%m%d)/', 'access_key', 'secret_key')"
   ```

3. **Staged rollout**:
   ```bash
   # Upgrade one replica at a time
   # Monitor for issues between each upgrade
   ```

## Storage Scaling Procedures

### Current Usage Monitoring
```bash
# Check current storage usage
kubectl exec chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz -- \
  df -h /var/lib/clickhouse

# Check table sizes
kubectl exec chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz -- \
  clickhouse-client -q "SELECT database, table, formatReadableSize(sum(data_compressed_bytes)) as size FROM system.parts GROUP BY database, table ORDER BY sum(data_compressed_bytes) DESC LIMIT 10"
```

### Vertical Scaling (Increase PVC Size)
```bash
# Check if storage class supports expansion
kubectl get storageclass gp3 -o yaml | grep allowVolumeExpansion

# If supported, patch PVC (requires pod restart)
kubectl patch pvc data-chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz \
  -p '{"spec":{"resources":{"requests":{"storage":"2000Gi"}}}}'

# Restart pod to apply changes
kubectl delete pod chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz
```

### Horizontal Scaling (Add Shards)
**⚠️ COMPLEX OPERATION**: Adding shards requires data rebalancing.

1. **Plan carefully**: Calculate data distribution strategy
2. **Backup first**: Full cluster backup before scaling
3. **Update cluster configuration**:
   ```yaml
   # In clickhouse-ha-cluster.yaml
   shardsCount: 3  # Increase from 2 to 3
   ```
4. **Data migration**: May require manual data rebalancing

## Performance Optimization

### Resource Scaling
```bash
# Monitor resource usage
kubectl top pods -n signoz

# Scale query service for high load
kubectl scale deployment signoz-query-service -n signoz --replicas=5

# Update resource limits if needed
kubectl patch deployment signoz-query-service -n signoz -p '{"spec":{"template":{"spec":{"containers":[{"name":"query-service","resources":{"limits":{"memory":"8Gi","cpu":"4"}}}]}}}}'
```

### ClickHouse Tuning
```yaml
# In clickhouse-ha-cluster.yaml, add settings:
settings:
  max_memory_usage: 8000000000  # 8GB
  max_threads: 8
  max_execution_time: 300
  send_timeout: 300
  receive_timeout: 300
```

## Disaster Recovery Procedures

### Regular Backup Strategy
```bash
# Daily backup script (should be automated)
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_BUCKET="your-backup-bucket"

# Backup ClickHouse data
kubectl exec chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz -- \
  clickhouse-client -q "BACKUP DATABASE signoz_traces TO S3('s3://$BACKUP_BUCKET/daily/$DATE/traces/')"

kubectl exec chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz -- \
  clickhouse-client -q "BACKUP DATABASE signoz_metrics TO S3('s3://$BACKUP_BUCKET/daily/$DATE/metrics/')"

# Backup Kubernetes configurations
kubectl get all,pvc,configmap,secret,ingress -n signoz -o yaml > k8s-backup-$DATE.yaml
aws s3 cp k8s-backup-$DATE.yaml s3://$BACKUP_BUCKET/k8s/
```

### Recovery Procedures
```bash
# 1. Restore Kubernetes resources
kubectl apply -f k8s-backup-YYYYMMDD_HHMMSS.yaml

# 2. Wait for pods to be ready
kubectl wait --for=condition=Ready pod -l app.kubernetes.io/instance=signoz -n signoz --timeout=600s

# 3. Restore ClickHouse data
kubectl exec chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz -- \
  clickhouse-client -q "RESTORE DATABASE signoz_traces FROM S3('s3://your-backup-bucket/daily/YYYYMMDD_HHMMSS/traces/')"

# 4. Verify data integrity
kubectl exec chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz -- \
  clickhouse-client -q "SELECT count() FROM signoz_traces.distributed_signoz_index_v2"
```

## Monitoring Future Changes

### Helm Chart Changes to Watch
1. **Schema migration job configuration** - Critical for our setup
2. **ClickHouse version updates** - May affect compatibility
3. **Resource requirements changes** - May need adjustment
4. **New configuration options** - May improve performance

### Automation Recommendations
```yaml
# Create alerts for:
- Helm chart updates available
- Schema migration job failures  
- Storage usage thresholds (>80%)
- Performance degradation
- Pod restart loops
```

## Testing Strategy

### Staging Environment
1. **Mirror production configuration** exactly
2. **Test all upgrades** in staging first
3. **Validate schema migration** works correctly
4. **Performance testing** after upgrades

### Pre-Production Checklist
```bash
# Functional tests
curl http://staging-alb/api/v1/health
curl http://staging-alb/api/v1/settings
# ... all critical endpoints

# Performance tests
# Run load tests to ensure performance is maintained

# Data integrity tests
# Verify data ingestion and querying works correctly
```

## Complete Solution Summary (2025-07-21)

### The ClickHouse Service Name Problem
**Issue**: SigNoz Helm upgrades may create duplicate ClickHouse installations, and after resolving conflicts, both SigNoz main service and OTel collectors may be configured to connect to the wrong ClickHouse service name.

**Root Cause**: 
- Upgrade creates new ClickHouse installation (`signoz-clickhouse`) 
- Existing installation uses different name (`clickhouse-signoz-clickhouse-ha`)
- After cleaning up conflicts, services still try to connect to deleted service

**Complete Solution**: 
✅ **signoz-ha-values.yaml** now contains permanent configuration:
```yaml
signoz:
  additionalEnvs:
    CLICKHOUSE_HOST:
      value: "clickhouse-signoz-clickhouse-ha"
      
otelCollector:
  additionalEnvs:
    CLICKHOUSE_HOST:
      value: "clickhouse-signoz-clickhouse-ha"
```

**Benefits**:
- ✅ No manual patching required after upgrades
- ✅ Prevents data ingestion failures
- ✅ Permanent solution persists across all future upgrades
- ✅ Both SigNoz app and OTel collectors configured correctly

**Usage**: Simply use `helm upgrade signoz signoz/signoz -n signoz -f signoz-ha-values.yaml` for all future upgrades.

## Emergency Rollback Procedures

### Helm Rollback
```bash
# Check rollback options
helm history signoz -n signoz

# Rollback to previous version
helm rollback signoz -n signoz

# If rollback fails, restore from backup
kubectl delete namespace signoz
kubectl create namespace signoz
kubectl apply -f k8s-backup-last-known-good.yaml
```

### Recovery Time Objectives
- **RTO (Recovery Time Objective)**: 30 minutes
- **RPO (Recovery Point Objective)**: 4 hours (backup frequency)

---

**Always remember**: Document any new issues discovered during upgrades and update these procedures accordingly. The schema migration issue was discovered through production experience - similar issues may emerge in future versions.