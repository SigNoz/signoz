# SigNoz Production Troubleshooting Runbook

## Quick Reference Commands

### Cluster Status Check
```bash
# Set context
kubectl config use-context signoz-prod

# Overall cluster health
kubectl get nodes
kubectl get pods -n signoz
kubectl top nodes
kubectl top pods -n signoz
```

### SigNoz Application Health
```bash
# Check main services
kubectl get deployments -n signoz
kubectl get statefulsets -n signoz
kubectl get ingress -n signoz

# Test endpoints
ALB_HOST=$(kubectl get ingress signoz-alb-ingress -n signoz -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
curl -I http://$ALB_HOST/api/v1/health
curl -I http://$ALB_HOST/api/v1/settings
```

## Issue Categories and Solutions

### 1. Application Not Loading / 500 Errors

#### Symptoms
- SigNoz UI not loading
- 500 Internal Server Error
- Settings tab not working
- Main SigNoz pod showing "0/1 Running" or failing health checks

#### Diagnostic Steps
```bash
# Check SigNoz pod status first
kubectl get pods -n signoz | grep signoz-0

# Check if databases exist
kubectl exec chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz -- \
  clickhouse-client -q "SHOW DATABASES"

# Expected output should include:
# signoz_traces, signoz_metrics, signoz_logs, signoz_metadata, signoz_analytics

# Check schema migration status
kubectl get jobs -n signoz | grep schema
kubectl logs job/signoz-schema-migrator-sync -n signoz --tail=50

# CRITICAL: Check for duplicate ClickHouse installations (NEW in 2025-07-21)
kubectl get chi -n signoz

# Check SigNoz service configuration
kubectl get statefulset signoz -n signoz -o jsonpath='{.spec.template.spec.containers[0].env[?(@.name=="CLICKHOUSE_HOST")].value}'
kubectl get svc -n signoz | grep clickhouse
```

#### Solution
**If SigNoz pod is not ready and shows connection errors:**
```bash
# Check SigNoz logs for specific error
kubectl logs signoz-0 -n signoz --tail=20

# Common error: "dial tcp: lookup signoz-clickhouse on 10.100.0.10:53: no such host"
# This means SigNoz is trying to connect to wrong ClickHouse service

# Fix service name to match working ClickHouse service
kubectl patch statefulset signoz -n signoz -p '{"spec":{"template":{"spec":{"initContainers":[{"name":"signoz-init","command":["sh","-c","until wget --user \"${CLICKHOUSE_USER}:${CLICKHOUSE_PASSWORD}\" --spider -q clickhouse-signoz-clickhouse-ha:8123/ping; do echo -e \"waiting for clickhouseDB\"; sleep 5; done; echo -e \"clickhouse ready, starting query service now\";"]}],"containers":[{"name":"signoz","env":[{"name":"CLICKHOUSE_HOST","value":"clickhouse-signoz-clickhouse-ha"},{"name":"ClickHouseUrl","value":"tcp://clickhouse-signoz-clickhouse-ha:9000/?username=admin&password=27ff0399-0d3a-4bd8-919d-17c2181e6fb9"}]}]}}}}'

# Wait for rollout
kubectl rollout status statefulset/signoz -n signoz --timeout=300s
```

**If databases are missing or migration failed:**
```bash
# Delete failed migration job
kubectl delete job signoz-schema-migrator-sync -n signoz

# Apply fixed migration job
kubectl apply -f schema-migration-fixed.yaml

# Monitor progress
kubectl logs job/signoz-schema-migrator-fixed -n signoz -f
```

**If duplicate ClickHouse installations exist:**
```bash
# Delete the conflicting installation (see "ClickHouse Anti-Affinity Issues" section below)
kubectl delete chi signoz-clickhouse -n signoz
kubectl delete pvc $(kubectl get pvc -n signoz -o name | grep "clickhouse-prod") -n signoz
```

**If no data is showing in UI (metrics/logs empty):**
```bash
# Check if OTel collectors can connect to ClickHouse (NEW issue in 2025-07-21)
kubectl logs $(kubectl get pods -n signoz | grep otel-collector | awk '{print $1}' | head -1) -n signoz --tail=5

# PREFERRED: Use Helm upgrade with correct values (prevents future issues)
# The signoz-ha-values.yaml now contains the correct ClickHouse service configuration
helm upgrade signoz signoz/signoz -n signoz -f signoz-ha-values.yaml

# ALTERNATIVE: Quick patch if urgent (temporary fix)
kubectl patch deployment signoz-otel-collector -n signoz -p '{"spec":{"template":{"spec":{"containers":[{"name":"collector","env":[{"name":"CLICKHOUSE_HOST","value":"clickhouse-signoz-clickhouse-ha"}]}]}}}}'
kubectl rollout status deployment/signoz-otel-collector -n signoz

# Verify data ingestion after fix
kubectl exec chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz -- \
  clickhouse-client -q "SELECT count(*) FROM signoz_metrics.distributed_samples_v4 WHERE unix_milli > $(date -d '2 minutes ago' +%s)000"
```

### 2. ClickHouse Anti-Affinity Issues (CRITICAL - NEW in 2025-07-21)

#### Symptoms
- ClickHouse pods stuck in `Pending` state after upgrades
- Error: "0/3 nodes are available: didn't match pod anti-affinity rules"
- Multiple ClickHouse installations coexisting
- SigNoz showing 503 errors or failing to connect to ClickHouse

#### Immediate Diagnostic Steps
```bash
# Check for multiple ClickHouse installations (RED FLAG)
kubectl get chi -n signoz
# If you see more than one CHI resource, you have a conflict

# Check pending pods
kubectl get pods -n signoz | grep -E "clickhouse.*Pending"

# Check anti-affinity constraints
kubectl describe pod $(kubectl get pods -n signoz | grep clickhouse | grep Pending | awk '{print $1}' | head -1) -n signoz | grep -A 5 "Events:"

# Check node capacity vs pod requirements
kubectl get nodes
kubectl get pods -n signoz -l app.kubernetes.io/name=clickhouse -o wide
```

#### Resolution Steps
```bash
# Step 1: Identify which installation is working
kubectl get pods -n signoz -l app.kubernetes.io/name=clickhouse | grep Running
# Note the naming pattern (e.g., chi-signoz-clickhouse-ha-* vs chi-signoz-clickhouse-*)

# Step 2: Delete the conflicting/new installation (SAFE - keeps your data)
# Usually the one without "-ha" suffix is the conflicting new installation
kubectl delete chi signoz-clickhouse -n signoz  # Adjust name as needed

# Step 3: Clean up orphaned PVCs from deleted installation
kubectl get pvc -n signoz | grep "Pending\|clickhouse-prod"
kubectl delete pvc $(kubectl get pvc -n signoz -o name | grep "clickhouse-prod") -n signoz

# Step 4: Fix SigNoz service connection if needed
kubectl patch statefulset signoz -n signoz -p '{"spec":{"template":{"spec":{"containers":[{"name":"signoz","env":[{"name":"CLICKHOUSE_HOST","value":"clickhouse-signoz-clickhouse-ha"}]}]}}}}'

# Step 5: CRITICAL - Fix OTel Collector service connection (NEW in 2025-07-21)
kubectl patch deployment signoz-otel-collector -n signoz -p '{"spec":{"template":{"spec":{"containers":[{"name":"collector","env":[{"name":"CLICKHOUSE_HOST","value":"clickhouse-signoz-clickhouse-ha"}]}]}}}}'
kubectl rollout status deployment/signoz-otel-collector -n signoz

# Step 6: Verify resolution
kubectl get pods -n signoz | grep clickhouse  # All should be Running
kubectl get pods -n signoz | grep signoz-0    # Should be 1/1 Running
kubectl exec chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz -- \
  clickhouse-client -q "SELECT count(*) FROM signoz_metrics.distributed_samples_v4 WHERE unix_milli > $(date -d '2 minutes ago' +%s)000"
# Should show >1000 recent metrics if data ingestion is working
```

### 3. ClickHouse Cluster Issues

#### Symptoms
- Queries timing out
- Data inconsistency
- Pod failures

#### Diagnostic Steps
```bash
# Check cluster topology
kubectl exec chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz -- \
  clickhouse-client -q "SELECT * FROM system.clusters WHERE cluster = 'prod'"

# Should show 2 shards, 2 replicas each (4 total nodes)

# Check individual pod health
kubectl get pods -n signoz -l clickhouse.altinity.com/chi=signoz-clickhouse-ha

# Check logs for errors
kubectl logs chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz --tail=100
```

#### Common Fixes

**Shard Count Mismatch**:
```bash
# Check expected vs actual shards
kubectl exec chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz -- \
  clickhouse-client -q "SELECT count(DISTINCT(shard_num)) FROM system.clusters WHERE cluster = 'prod'"

# Should return 2. If not, check cluster configuration
kubectl get clickhouseinstallation signoz-clickhouse-ha -n signoz -o yaml
```

**Pod Restart Loop**:
```bash
# Check resource constraints
kubectl describe pod chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz

# Check storage
kubectl get pvc -n signoz
kubectl describe pvc data-chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz
```

### 3. Load Balancer / Networking Issues

#### Symptoms
- Cannot reach SigNoz UI
- DNS resolution failures
- Connection timeouts

#### Diagnostic Steps
```bash
# Check ALB status
kubectl get ingress signoz-alb-ingress -n signoz
kubectl describe ingress signoz-alb-ingress -n signoz

# Check service endpoints
kubectl get svc signoz -n signoz
kubectl get endpoints signoz -n signoz

# Test from within cluster
kubectl run test-pod --image=busybox --rm -it -- /bin/sh
# Inside pod: wget -O- signoz.signoz.svc.cluster.local:8080/api/v1/health
```

#### Solutions

**ALB Not Provisioned**:
```bash
# Check AWS Load Balancer Controller
kubectl get deployment aws-load-balancer-controller -n kube-system
kubectl logs deployment/aws-load-balancer-controller -n kube-system

# Check IAM permissions
aws sts get-caller-identity
```

**Service Not Finding Pods**:
```bash
# Check service selector
kubectl get svc signoz -n signoz -o yaml

# Verify pod labels match
kubectl get pods -n signoz --show-labels | grep frontend
```

### 4. Performance Issues

#### Symptoms
- Slow query responses
- High memory usage
- CPU throttling

#### Diagnostic Steps
```bash
# Check resource usage
kubectl top pods -n signoz
kubectl top nodes

# Check ClickHouse query performance
kubectl exec chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz -- \
  clickhouse-client -q "SELECT query, elapsed, memory_usage FROM system.processes"

# Check disk I/O
kubectl exec chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz -- \
  iostat -x 1 5
```

#### Performance Tuning
```bash
# Scale pods if needed
kubectl scale deployment signoz-query-service -n signoz --replicas=5

# Check if autoscaling is working
kubectl get hpa -n signoz
```

### 5. Storage Issues (Updated 2025-07-21)

#### Symptoms
- Pod evictions
- Out of disk space errors
- PVC pending state
- "No space left on device" in logs

#### Current Storage Allocation (Post-Expansion)
- **ClickHouse**: 5TB total (5 × 1000Gi volumes)
- **Zookeeper**: 150Gi total (3 × 50Gi) - **Expanded from 8Gi**
- **SigNoz DB**: 20Gi - **Expanded from 1Gi**

#### Diagnostic Steps
```bash
# Check PVC status (should show expanded sizes)
kubectl get pvc -n signoz

# Check storage usage across all components
echo "=== ClickHouse Storage ==="
for pod in $(kubectl get pods -n signoz -l clickhouse.altinity.com/chi=signoz-clickhouse-ha -o jsonpath='{.items[*].metadata.name}'); do
  echo "Pod: $pod"
  kubectl exec $pod -n signoz -- df -h /var/lib/clickhouse | grep -v Filesystem
done

echo "=== Zookeeper Storage ==="
for i in 0 1 2; do
  echo "ZooKeeper-$i:"
  kubectl exec signoz-zookeeper-$i -n signoz -- df -h /bitnami/zookeeper | grep -v Filesystem
done

echo "=== SigNoz DB Storage ==="
kubectl exec signoz-0 -n signoz -- df -h /var/lib/signoz | grep -v Filesystem

# Check storage class allows expansion
kubectl get storageclass gp3 -o yaml | grep allowVolumeExpansion
```

#### Storage Expansion Solutions

**Standard PVC Expansion Process**:
```bash
# 1. Identify PVC to expand
PVC_NAME="data-signoz-zookeeper-0"  # example
NEW_SIZE="100Gi"                     # example

# 2. Patch PVC (gp3 supports expansion)
kubectl patch pvc $PVC_NAME -n signoz --type='merge' -p='{"spec":{"resources":{"requests":{"storage":"'$NEW_SIZE'"}}}}'

# 3. Monitor expansion progress
kubectl describe pvc $PVC_NAME -n signoz | grep -A 10 "Events:"

# 4. Restart pod to complete filesystem resize
POD_NAME=$(kubectl get pods -n signoz -o jsonpath='{.items[?(@.spec.volumes[*].persistentVolumeClaim.claimName=="'$PVC_NAME'")].metadata.name}')
kubectl delete pod $POD_NAME -n signoz

# 5. Verify expansion
kubectl get pvc $PVC_NAME -n signoz
kubectl exec $POD_NAME -n signoz -- df -h
```

**Batch Expansion (Multiple PVCs)**:
```bash
# Expand all Zookeeper PVCs to 100Gi
for i in 0 1 2; do
  echo "Expanding data-signoz-zookeeper-$i to 100Gi"
  kubectl patch pvc data-signoz-zookeeper-$i -n signoz --type='merge' -p='{"spec":{"resources":{"requests":{"storage":"100Gi"}}}}'
done

# Restart Zookeeper pods sequentially (maintains quorum)
kubectl delete pod signoz-zookeeper-0 -n signoz && sleep 60
kubectl delete pod signoz-zookeeper-1 -n signoz && sleep 60  
kubectl delete pod signoz-zookeeper-2 -n signoz
```

**Emergency Data Cleanup**:
```bash
# Check largest tables first
kubectl exec chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz -- \
  clickhouse-client -q "
  SELECT 
    database, 
    table, 
    formatReadableSize(sum(data_compressed_bytes)) as size,
    count() as parts,
    min(partition) as oldest_partition,
    max(partition) as newest_partition
  FROM system.parts 
  WHERE active = 1 
  GROUP BY database, table 
  ORDER BY sum(data_compressed_bytes) DESC 
  LIMIT 10"

# Drop old partitions (CAREFUL! Test in dev first)
kubectl exec chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz -- \
  clickhouse-client -q "
  ALTER TABLE signoz_traces.distributed_signoz_index_v2 
  DROP PARTITION WHERE toDate(timestamp) < today() - 30"

# Optimize tables to reclaim space
kubectl exec chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz -- \
  clickhouse-client -q "OPTIMIZE TABLE signoz_traces.signoz_index_v2 FINAL"
```

#### Resource Limits Troubleshooting
**CRITICAL**: All resource limits have been removed (2025-07-21 update).

```bash
# Verify no limits are constraining pods
kubectl get pods -n signoz -o jsonpath='{range .items[*]}{.metadata.name}{": limits="}{.spec.containers[0].resources.limits}{"\n"}{end}'

# Should show null/empty for all pods
# If limits appear, they need to be removed from deployment configs
```

#### Storage Performance Issues
```bash
# Check IOPS utilization on EBS volumes
kubectl exec chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz -- iostat -x 1 5

# Check for I/O wait and bottlenecks
kubectl exec chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz -- \
  clickhouse-client -q "
  SELECT 
    query_id,
    elapsed,
    formatReadableSize(read_bytes) as data_read,
    formatReadableSize(written_bytes) as data_written,
    query
  FROM system.processes 
  WHERE elapsed > 5
  ORDER BY elapsed DESC"
```

## Emergency Procedures

### Complete Service Outage

1. **Immediate Actions**:
   ```bash
   # Check cluster status
   kubectl get nodes
   kubectl get pods -A --field-selector=status.phase!=Running
   
   # Check critical namespaces
   kubectl get pods -n signoz
   kubectl get pods -n kube-system
   ```

2. **Restart Services**:
   ```bash
   # Restart SigNoz components
   kubectl rollout restart deployment signoz-query-service -n signoz
   kubectl rollout restart deployment signoz-frontend -n signoz
   kubectl rollout restart deployment signoz-otel-collector -n signoz
   ```

3. **Nuclear Option** (Last Resort):
   ```bash
   # Restart all SigNoz pods
   kubectl delete pods -n signoz --all
   
   # Wait for pods to come back
   kubectl wait --for=condition=Ready pod -l app.kubernetes.io/instance=signoz -n signoz --timeout=300s
   ```

### Data Corruption

1. **Stop writes**:
   ```bash
   kubectl scale deployment signoz-otel-collector -n signoz --replicas=0
   ```

2. **Assess damage**:
   ```bash
   # Check ClickHouse table integrity
   kubectl exec chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz -- \
     clickhouse-client -q "CHECK TABLE signoz_traces.distributed_signoz_index_v2"
   ```

3. **Restore from backup** (if available):
   ```bash
   # Restore procedure depends on backup strategy
   # Document your specific backup/restore procedures here
   ```

## Monitoring and Alerting

### Key Metrics to Monitor

1. **Application Health**:
   - HTTP response codes (should be mostly 2xx)
   - Response time latency
   - Active user sessions

2. **ClickHouse Performance**:
   - Query execution time
   - Memory usage per query
   - Disk I/O wait time
   - Replication lag

3. **Infrastructure**:
   - Pod restart count
   - Node resource utilization
   - PVC usage percentage
   - Network connectivity

### Alert Thresholds

```yaml
# Example alert rules (adapt to your monitoring system)
alerts:
  - name: SigNozDown
    condition: up{job="signoz"} == 0
    duration: 5m
    
  - name: HighQueryLatency
    condition: clickhouse_query_duration_seconds > 10
    duration: 2m
    
  - name: DiskSpaceHigh
    condition: disk_usage_percent > 85
    duration: 5m
    
  - name: PodRestartHigh
    condition: increase(kube_pod_container_status_restarts_total[1h]) > 5
    duration: 1m
```

## Recovery Verification

After resolving any issue, verify full functionality:

```bash
# 1. Check all pods are running
kubectl get pods -n signoz

# 2. Test health endpoints
ALB_HOST=$(kubectl get ingress signoz-alb-ingress -n signoz -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
curl http://$ALB_HOST/api/v1/health
curl http://$ALB_HOST/api/v1/settings

# 3. Test query functionality
kubectl exec chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz -- \
  clickhouse-client -q "SELECT count() FROM signoz_traces.distributed_signoz_index_v2 LIMIT 1"

# 4. Check logs for errors
kubectl logs deployment/signoz-frontend -n signoz --tail=50
kubectl logs deployment/signoz-query-service -n signoz --tail=50

# 5. Verify data ingestion (if applicable)
# Send test traces/metrics and verify they appear in UI
```

## Contact Information

- **On-call Engineer**: [Your escalation process]
- **DevOps Team**: [Contact details]
- **SigNoz Support**: https://signoz.io/docs/
- **Emergency Escalation**: [Your emergency contact]

---

**Remember**: Always document any incidents and solutions for future reference. Update this runbook as you discover new issues and solutions.