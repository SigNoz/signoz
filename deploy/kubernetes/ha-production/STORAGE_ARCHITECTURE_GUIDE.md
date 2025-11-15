# SigNoz Storage Architecture Guide

## Overview
This document covers the storage architecture for our distributed SigNoz deployment on AWS EKS, including how data is distributed, storage management, and troubleshooting procedures.

## Storage Architecture

### High-Level Storage Design
```
┌─────────────────────────────────────────────────────────────┐
│                    AWS EKS Cluster                          │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │               ClickHouse Cluster "prod"                 │ │
│  │                                                         │ │
│  │  ┌─────────────┐     ┌─────────────┐                    │ │
│  │  │   Shard 1   │     │   Shard 2   │                    │ │
│  │  │             │     │             │                    │ │
│  │  │ ┌─────────┐ │     │ ┌─────────┐ │                    │ │
│  │  │ │Replica 1│ │     │ │Replica 1│ │                    │ │
│  │  │ │1TB EBS  │ │     │ │1TB EBS  │ │                    │ │
│  │  │ │gp3      │ │     │ │gp3      │ │                    │ │
│  │  │ └─────────┘ │     │ └─────────┘ │                    │ │
│  │  │             │     │             │                    │ │
│  │  │ ┌─────────┐ │     │ ┌─────────┐ │                    │ │
│  │  │ │Replica 2│ │     │ │Replica 2│ │                    │ │
│  │  │ │1TB EBS  │ │     │ │1TB EBS  │ │                    │ │
│  │  │ │gp3      │ │     │ │gp3      │ │                    │ │
│  │  │ └─────────┘ │     │ └─────────┘ │                    │ │
│  │  └─────────────┘     └─────────────┘                    │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘

Total Storage: 5TB (5 × 1TB volumes) - UPDATED 2025-07-21
Data Distribution: Sharded across 2 shards, replicated 2x each + 1 legacy volume
Availability: Survives loss of any single node or AZ
```

### Detailed Storage Components

#### 1. EBS Volumes Configuration
- **Storage Class**: gp3 (General Purpose SSD)
- **Volume Size**: 1TB per ClickHouse pod (1000Gi)
- **Access Mode**: ReadWriteOnce (RWO)
- **Availability Zone**: Distributed across 2 AZs
- **Total Capacity**: 5TB raw (2TB effective after replication + 1TB legacy)

#### 2. ClickHouse Data Distribution

**Sharding Strategy**:
- Data split into 2 shards based on hash function
- Each shard contains ~50% of total data
- Parallel processing across shards for better performance

**Replication Strategy**:
- Each shard replicated 2 times
- Replicas stored on different nodes for HA
- Automatic failover if replica becomes unavailable

#### 3. Data Layout per Database

```sql
-- Example data distribution for traces
Shard 1 (50% of data):
├── Replica 1: chi-signoz-clickhouse-ha-prod-0-0-0 (Node A, AZ 1)
└── Replica 2: chi-signoz-clickhouse-ha-prod-0-1-0 (Node B, AZ 2)

Shard 2 (50% of data):
├── Replica 1: chi-signoz-clickhouse-ha-prod-1-0-0 (Node C, AZ 1)
└── Replica 2: chi-signoz-clickhouse-ha-prod-1-1-0 (Node A, AZ 2)
```

## Storage Classes and Performance

### gp3 Storage Characteristics
- **Baseline Performance**: 3,000 IOPS, 125 MB/s throughput
- **Burst Capability**: Up to 16,000 IOPS
- **Latency**: Single-digit millisecond
- **Durability**: 99.999999999% (11 9's)
- **Cost**: Optimized for cost-performance ratio

### Performance Tuning
```yaml
# Current storage configuration
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: data-volume-template
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1000Gi
  storageClassName: gp3
```

## Data Distribution and Querying

### How Data Flows

#### 1. Data Ingestion
```
OTEL Collector → Kafka → ClickHouse Distributed Tables
                   ↓
          Hash-based distribution across shards
                   ↓
        ┌─────────────┐         ┌─────────────┐
        │   Shard 1   │         │   Shard 2   │
        │             │         │             │
        │ Data Type A │         │ Data Type B │
        │ (Hash % 2=0)│         │ (Hash % 2=1)│
        └─────────────┘         └─────────────┘
```

#### 2. Query Processing
```
Query Request → Load Balancer → Any ClickHouse Pod
                                      ↓
                            Distributed Query Execution
                                      ↓
                    ┌─────────────────┼─────────────────┐
                    ▼                                   ▼
              Query Shard 1                      Query Shard 2
                    ↓                                   ↓
            Aggregate Results ←──────────────────→ Aggregate Results
                    ↓
              Return Final Result
```

### Table Types and Storage Impact

#### Local Tables (Per Shard)
```sql
-- Example: signoz_traces.signoz_index_v2
-- Stores actual data on each shard
-- Size varies per shard based on data distribution
```

#### Distributed Tables (Cluster-wide)
```sql
-- Example: signoz_traces.distributed_signoz_index_v2
-- Virtual table that routes queries to all shards
-- No data storage, only query routing
```

#### Replicated Tables
```sql
-- Example: ReplicatedMergeTree tables
-- Automatically sync data between replicas
-- Ensures data consistency and availability
```

## Storage Monitoring and Management

### Key Metrics to Monitor

#### 1. Disk Space Usage
```bash
# Check overall disk usage per pod
kubectl exec chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz -- df -h /var/lib/clickhouse

# Check ClickHouse data directory breakdown
kubectl exec chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz -- \
  du -sh /var/lib/clickhouse/data/*/

# Get table sizes across cluster
kubectl exec chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz -- \
  clickhouse-client -q "
  SELECT 
    database, 
    table, 
    formatReadableSize(sum(data_compressed_bytes)) as compressed_size,
    formatReadableSize(sum(data_uncompressed_bytes)) as uncompressed_size,
    count() as parts_count
  FROM system.parts 
  WHERE active = 1
  GROUP BY database, table 
  ORDER BY sum(data_compressed_bytes) DESC
  LIMIT 20"
```

#### 2. Storage Performance
```bash
# Check IOPS and throughput
kubectl exec chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz -- iostat -x 1 5

# Check for storage bottlenecks
kubectl exec chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz -- \
  clickhouse-client -q "
  SELECT 
    query_id,
    query,
    elapsed,
    read_bytes,
    written_bytes,
    memory_usage
  FROM system.processes 
  WHERE query != ''"
```

#### 3. Data Distribution Balance
```bash
# Check data distribution across shards
kubectl exec chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz -- \
  clickhouse-client -q "
  SELECT 
    hostName() as host,
    database,
    table,
    formatReadableSize(sum(data_compressed_bytes)) as size
  FROM cluster('prod', system.parts) 
  WHERE active = 1
  GROUP BY hostName(), database, table
  ORDER BY database, table, hostName()"
```

### Storage Alerts and Thresholds

#### Critical Thresholds
```yaml
# Recommended alert thresholds
alerts:
  disk_usage_warning: 75%    # Start monitoring closely
  disk_usage_critical: 85%   # Take immediate action
  disk_usage_emergency: 95%  # Emergency cleanup required
  
  # IOPS utilization
  iops_utilization_high: 80%
  
  # Data imbalance between shards
  shard_size_imbalance: 20%  # >20% difference between shards
```

#### Monitoring Commands
```bash
# Create monitoring script
cat > /home/ubuntu/projects/yaniv_projects/eks/storage-monitor.sh << 'EOF'
#!/bin/bash

echo "=== Storage Usage Report $(date) ==="
echo

# Check PVC usage
echo "PVC Status:"
kubectl get pvc -n signoz | grep clickhouse

echo -e "\nDisk Usage per Pod:"
for pod in $(kubectl get pods -n signoz -l clickhouse.altinity.com/chi=signoz-clickhouse-ha -o jsonpath='{.items[*].metadata.name}'); do
  echo "Pod: $pod"
  kubectl exec $pod -n signoz -- df -h /var/lib/clickhouse | grep -v Filesystem
done

echo -e "\nTable Sizes:"
kubectl exec chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz -- \
  clickhouse-client -q "
  SELECT 
    database, 
    table, 
    formatReadableSize(sum(data_compressed_bytes)) as size
  FROM system.parts 
  WHERE active = 1 AND database LIKE 'signoz_%'
  GROUP BY database, table 
  ORDER BY sum(data_compressed_bytes) DESC"

echo -e "\n=== End Report ==="
EOF

chmod +x /home/ubuntu/projects/yaniv_projects/eks/storage-monitor.sh
```

## Storage Scaling Procedures

### Vertical Scaling (Increase Volume Size)

#### Prerequisites
```bash
# Check if storage class supports volume expansion
kubectl get storageclass gp3 -o yaml | grep allowVolumeExpansion
# Should return: allowVolumeExpansion: true
```

#### Scaling Process
```bash
# 1. Check current PVC sizes
kubectl get pvc -n signoz | grep clickhouse

# 2. Patch PVC to new size (example: 1000Gi → 2000Gi)
for pvc in $(kubectl get pvc -n signoz -o name | grep clickhouse); do
  echo "Scaling $pvc to 2000Gi"
  kubectl patch $pvc -n signoz -p '{"spec":{"resources":{"requests":{"storage":"2000Gi"}}}}'
done

# 3. Restart pods to apply changes (ClickHouse handles this gracefully)
kubectl delete pods -n signoz -l clickhouse.altinity.com/chi=signoz-clickhouse-ha

# 4. Monitor resize progress
kubectl get pvc -n signoz -w | grep clickhouse

# 5. Verify new size
kubectl exec chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz -- df -h /var/lib/clickhouse
```

### Horizontal Scaling (Add Shards)

#### ⚠️ WARNING: Complex Operation
Adding shards requires careful planning and data migration. Current 2-shard setup is optimal for most workloads.

#### When to Consider Adding Shards
- Query performance degradation despite optimizations
- Single shard consistently hitting resource limits
- Data growth exceeding vertical scaling capabilities

#### Process Overview (Advanced)
1. **Planning Phase**:
   - Calculate expected data distribution
   - Plan maintenance window
   - Backup all data

2. **Configuration Update**:
   ```yaml
   # Update clickhouse-ha-cluster.yaml
   shardsCount: 3  # Increase from 2
   replicasCount: 2  # Keep same
   ```

3. **Data Rebalancing**:
   - ClickHouse doesn't automatically rebalance existing data
   - New data will use new shard configuration
   - May require manual data migration for optimal distribution

## Storage Troubleshooting

### Common Storage Issues

#### 1. Pod Stuck in Pending (PVC Issues)
```bash
# Symptoms
kubectl get pods -n signoz | grep Pending

# Diagnosis
kubectl describe pod <pending-pod> -n signoz
kubectl get pvc -n signoz
kubectl describe pvc <pvc-name> -n signoz

# Common causes and solutions
# - Insufficient storage quota: Check AWS account limits
# - AZ constraints: Ensure nodes available in target AZ
# - Storage class issues: Verify gp3 storage class exists
```

#### 2. Disk Space Full
```bash
# Emergency cleanup procedure
# 1. Identify largest tables
kubectl exec chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz -- \
  clickhouse-client -q "
  SELECT 
    database, 
    table, 
    formatReadableSize(sum(data_compressed_bytes)) as size,
    max(partition) as latest_partition
  FROM system.parts 
  WHERE active = 1 
  GROUP BY database, table 
  ORDER BY sum(data_compressed_bytes) DESC 
  LIMIT 10"

# 2. Drop old partitions (CAREFUL!)
# Example: Drop partitions older than 30 days
kubectl exec chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz -- \
  clickhouse-client -q "
  ALTER TABLE signoz_traces.distributed_signoz_index_v2 
  DROP PARTITION WHERE toDate(timestamp) < today() - 30"

# 3. Optimize tables to reclaim space
kubectl exec chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz -- \
  clickhouse-client -q "OPTIMIZE TABLE signoz_traces.signoz_index_v2 FINAL"
```

#### 3. Performance Degradation
```bash
# Check for storage bottlenecks
# 1. IOPS utilization
kubectl exec chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz -- iostat -x 1 5

# 2. Slow queries
kubectl exec chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz -- \
  clickhouse-client -q "
  SELECT 
    query_id,
    user,
    elapsed,
    formatReadableSize(read_bytes) as read_data,
    query
  FROM system.processes 
  WHERE elapsed > 10
  ORDER BY elapsed DESC"

# 3. Check for mutations (background operations)
kubectl exec chi-signoza-clickhouse-ha-prod-0-0-0 -n signoz -- \
  clickhouse-client -q "SELECT * FROM system.mutations WHERE is_done = 0"
```

#### 4. Data Inconsistency Between Replicas
```bash
# Check replication status
kubectl exec chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz -- \
  clickhouse-client -q "
  SELECT 
    database,
    table,
    replica_name,
    is_leader,
    log_max_index,
    log_pointer,
    queue_size
  FROM system.replicas
  WHERE database LIKE 'signoz_%'"

# Force synchronization if needed
kubectl exec chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz -- \
  clickhouse-client -q "SYSTEM SYNC REPLICA signoz_traces.signoz_index_v2"
```

## Data Retention and Lifecycle Management

### Current Retention Policy
- **Traces**: 7 days (configurable)
- **Metrics**: 30 days (configurable)
- **Logs**: 7 days (configurable)

### Implementing TTL (Time To Live)
```sql
-- Example: Set TTL for traces table
ALTER TABLE signoz_traces.signoz_index_v2 
MODIFY TTL timestamp + INTERVAL 7 DAY;

-- Check TTL status
SELECT 
  database,
  table,
  ttl_info
FROM system.tables 
WHERE database LIKE 'signoz_%' AND ttl_info != '';
```

### Automated Cleanup Script
```bash
# Create cleanup script
cat > /home/ubuntu/projects/yaniv_projects/eks/cleanup-old-data.sh << 'EOF'
#!/bin/bash

# Set retention periods (days)
TRACES_RETENTION=7
METRICS_RETENTION=30
LOGS_RETENTION=7

# Calculate cutoff dates
TRACES_CUTOFF=$(date -d "-${TRACES_RETENTION} days" +%Y-%m-%d)
METRICS_CUTOFF=$(date -d "-${METRICS_RETENTION} days" +%Y-%m-%d)
LOGS_CUTOFF=$(date -d "-${LOGS_RETENTION} days" +%Y-%m-%d)

echo "Starting cleanup process $(date)"
echo "Traces cutoff: $TRACES_CUTOFF"
echo "Metrics cutoff: $METRICS_CUTOFF"
echo "Logs cutoff: $LOGS_CUTOFF"

# Cleanup traces
kubectl exec chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz -- \
  clickhouse-client -q "
  ALTER TABLE signoz_traces.distributed_signoz_index_v2 
  DROP PARTITION WHERE toDate(timestamp) < toDate('$TRACES_CUTOFF')"

# Cleanup metrics  
kubectl exec chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz -- \
  clickhouse-client -q "
  ALTER TABLE signoz_metrics.distributed_time_series_v4 
  DROP PARTITION WHERE toDate(timestamp) < toDate('$METRICS_CUTOFF')"

# Cleanup logs
kubectl exec chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz -- \
  clickhouse-client -q "
  ALTER TABLE signoz_logs.distributed_logs 
  DROP PARTITION WHERE toDate(timestamp) < toDate('$LOGS_CUTOFF')"

echo "Cleanup completed $(date)"
EOF

chmod +x /home/ubuntu/projects/yaniv_projects/eks/cleanup-old-data.sh

# Schedule via cron (example: daily at 2 AM)
# 0 2 * * * /home/ubuntu/projects/yaniv_projects/eks/cleanup-old-data.sh >> /var/log/signoz-cleanup.log 2>&1
```

## Backup and Recovery

### Storage-Level Backup
```bash
# EBS Snapshot creation
aws ec2 describe-volumes --filters "Name=tag:kubernetes.io/cluster/signoz-prod,Values=owned" \
  --query 'Volumes[*].VolumeId' --output text | \
  while read volume; do
    aws ec2 create-snapshot --volume-id $volume \
      --description "SigNoz backup $(date +%Y%m%d_%H%M%S)" \
      --tag-specifications "ResourceType=snapshot,Tags=[{Key=Purpose,Value=SigNozBackup},{Key=Date,Value=$(date +%Y%m%d)}]"
  done
```

### Application-Level Backup
```bash
# ClickHouse backup to S3
kubectl exec chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz -- \
  clickhouse-client -q "
  BACKUP DATABASE signoz_traces 
  TO S3('s3://your-backup-bucket/signoz/$(date +%Y%m%d)/traces/', 'access_key', 'secret_key')"
```

## Best Practices

### Storage Management
1. **Monitor disk usage weekly** - Set up automated alerts
2. **Plan for growth** - Monitor trends and scale proactively
3. **Regular cleanup** - Implement automated data retention
4. **Test recovery** - Regularly test backup and restore procedures
5. **Document changes** - Keep storage configuration documented

### Performance Optimization
1. **Use appropriate storage class** - gp3 for balanced performance/cost
2. **Monitor IOPS utilization** - Scale up if consistently high
3. **Optimize queries** - Reduce unnecessary data scanning
4. **Balance shards** - Ensure even data distribution

### Security
1. **Encrypt at rest** - Enable EBS encryption
2. **Network policies** - Restrict access to storage endpoints
3. **Access control** - Use least privilege for storage operations
4. **Audit access** - Monitor who accesses storage systems

---

## Recent Storage Updates (2025-07-21)

### Storage Capacity Changes
- **Zookeeper**: Expanded from 8Gi → **50Gi per replica** (150Gi total)
- **SigNoz DB**: Expanded from 1Gi → **20Gi** (SQLite metadata storage)
- **ClickHouse**: Maintained at 1TB per volume (5TB total)

### Resource Limits Removal
**CRITICAL UPDATE**: All resource limits have been removed from deployments for better resource utilization:
- ClickHouse: No CPU/memory limits
- Kafka: No CPU/memory limits  
- Zookeeper: No CPU/memory limits
- Query Service: No CPU/memory limits
- Frontend: No CPU/memory limits
- OtelCollector: No CPU/memory limits
- AlertManager: No CPU/memory limits

**Impact**: Services can now use available node resources without artificial constraints.

### Storage Expansion Procedures Updated
```bash
# Standard PVC expansion process
kubectl patch pvc <pvc-name> -n signoz --type='merge' -p='{"spec":{"resources":{"requests":{"storage":"<new-size>"}}}}'

# Restart pod to complete filesystem resize
kubectl delete pod <pod-name> -n signoz

# Verify expansion
kubectl get pvc -n signoz
```

**Note**: StatefulSet volumeClaimTemplates cannot be updated directly - only live PVC expansion is supported.

### Current Storage Allocation Summary
```
Service          | Replicas | Per-Replica | Total    | Purpose
-----------------|----------|-------------|----------|------------------
ClickHouse       | 5        | 1000Gi     | 5TB      | Time-series data
Zookeeper        | 3        | 50Gi       | 150Gi    | Cluster coordination
SigNoz DB        | 1        | 20Gi       | 20Gi     | UI metadata (SQLite)
Kafka (planned)  | 3        | 200Gi      | 600Gi    | Message buffering
AlertManager     | 2        | 10Gi       | 20Gi     | Alert state
```

**Remember**: Storage is the foundation of your observability platform. Proper storage management ensures data reliability, performance, and cost efficiency.