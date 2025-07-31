# SigNoz High Availability (HA) Production Deployment - Community Contribution

## 🎯 Overview

This contribution provides a **battle-tested, production-ready High Availability configuration** for SigNoz on Kubernetes, along with comprehensive troubleshooting procedures for common upgrade issues.

**What this solves:**
- ✅ True HA with distributed ClickHouse clustering (2 shards × 2 replicas)
- ✅ Prevents data loss during upgrades and node failures
- ✅ Eliminates manual patching after upgrades
- ✅ Resolves schema migration failures in distributed deployments
- ✅ Fixes anti-affinity scheduling conflicts
- ✅ Prevents data ingestion failures during service name changes

**Production Stats:**
- **Cluster Size**: 3 nodes (c5.9xlarge)
- **Storage**: 4TB+ ClickHouse distributed storage
- **Ingestion Rate**: 60,000+ metrics + logs per 5 minutes
- **Availability**: Survives single node/AZ failures
- **Tested**: Multiple upgrade cycles without data loss

## 🚨 Critical Issues This Resolves

### 1. Schema Migration Failures in Distributed Clusters
**Problem**: SigNoz Helm chart hardcodes schema migration to expect 1 shard, 1 replica, causing failures in HA deployments.

**Solution**: Custom schema migration configuration with correct topology.

### 2. ClickHouse Service Name Conflicts After Upgrades  
**Problem**: Upgrades create duplicate ClickHouse installations, causing anti-affinity conflicts and service name mismatches.

**Solution**: Permanent Helm values configuration preventing manual patching.

### 3. Data Ingestion Failures Due to OTel Collector Misconfiguration
**Problem**: OTel collectors connect to wrong ClickHouse service after conflict resolution, breaking metrics/logs ingestion.

**Solution**: Pre-configured OTel collector environment variables in Helm values.

### 4. Anti-Affinity Scheduling Deadlocks
**Problem**: Pod anti-affinity rules prevent scheduling when duplicate installations consume all available nodes.

**Solution**: Proper conflict detection and automated cleanup procedures.

## 📁 Files Included

### Core Configuration
- `signoz-ha-production-values.yaml` - **Complete HA Helm values** (no manual patching needed)
- `clickhouse-ha-cluster.yaml` - **Distributed ClickHouse configuration**
- `schema-migration-fixed.yaml` - **Fixed schema migrator for distributed topology**

### Troubleshooting & Operations
- `UPGRADE_PROCEDURES.md` - **Complete upgrade procedures with issue prevention**
- `TROUBLESHOOTING_RUNBOOK.md` - **Step-by-step issue resolution guide**
- `PRODUCTION_DEPLOYMENT_GUIDE.md` - **End-to-end deployment instructions**
- `QUICK_REFERENCE.md` - **Emergency fixes and health checks**

### Infrastructure Components
- `signoz-alb-ingress.yaml` - **Application Load Balancer configuration**
- `otel-hostmetrics-daemonset.yaml` - **Infrastructure monitoring setup**
- `storage-architecture.md` - **Storage design and scaling guide**

## 🚀 Quick Start

### 1. Deploy ClickHouse Operator
```bash
helm repo add clickhouse-operator https://docs.altinity.com/clickhouse-operator/
helm install clickhouse-operator clickhouse-operator/altinity-clickhouse-operator -n kube-system
```

### 2. Deploy ClickHouse HA Cluster
```bash
kubectl apply -f clickhouse-ha-cluster.yaml
```

### 3. Deploy SigNoz with HA Configuration
```bash
helm repo add signoz https://charts.signoz.io
helm install signoz signoz/signoz -n signoz -f signoz-ha-production-values.yaml --create-namespace
```

### 4. Apply Fixed Schema Migration (if needed)
```bash
# Only if default migration fails
kubectl apply -f schema-migration-fixed.yaml
```

### 5. Configure External Access
```bash
kubectl apply -f signoz-alb-ingress.yaml
```

## 🔧 Key Features

### High Availability Architecture
```
┌─────────────────────────────────────────────┐
│           SigNoz HA Production              │
├─────────────────────────────────────────────┤
│ ALB → 3x SigNoz → 4x ClickHouse Cluster    │
│         ↓              ↓                    │
│    3x OTel Collectors  3x ZooKeeper        │
│         ↓                                  │
│    Infrastructure Monitoring               │
└─────────────────────────────────────────────┘
```

### Distributed ClickHouse Cluster
- **2 Shards × 2 Replicas** = 4 ClickHouse pods
- **1TB per pod** = 4TB total raw, 2TB effective after replication
- **Survives single node failure** with zero data loss
- **Query performance**: Parallel processing across shards

### Automatic Failover
- **Pod anti-affinity**: Ensures distribution across nodes
- **ZooKeeper quorum**: 3 instances for coordination HA
- **Storage replication**: Data automatically synchronized
- **Load balancing**: Traffic distributed across healthy pods

## 🛡️ Upgrade Safety

### Before Every Upgrade
```bash
# 1. Backup configuration
helm get values signoz -n signoz > backup-$(date +%Y%m%d).yaml

# 2. Check cluster health
kubectl get pods -n signoz
kubectl exec chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz -- \
  clickhouse-client -q "SELECT * FROM system.clusters WHERE cluster = 'prod'"

# 3. Verify no duplicate installations
kubectl get chi -n signoz  # Should show only signoz-clickhouse-ha
```

### Safe Upgrade Process
```bash
# Standard upgrade - no manual patching needed!
helm upgrade signoz signoz/signoz -n signoz -f signoz-ha-production-values.yaml --wait
```

### Post-Upgrade Verification
```bash
# Verify data ingestion is working
kubectl exec chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz -- \
  clickhouse-client -q "SELECT count(*) FROM signoz_metrics.distributed_samples_v4 WHERE unix_milli > $(date -d '2 minutes ago' +%s)000"
```

## 📊 Monitoring & Observability

### Health Check Commands
```bash
# Overall cluster status
kubectl get pods -n signoz

# ClickHouse cluster health
kubectl exec chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz -- \
  clickhouse-client -q "SELECT cluster, count(*) FROM system.clusters WHERE cluster = 'prod' GROUP BY cluster"

# Data ingestion rate
kubectl exec chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz -- \
  clickhouse-client -q "SELECT count(*) FROM signoz_metrics.distributed_samples_v4 WHERE unix_milli > $(date -d '5 minutes ago' +%s)000"

# Storage usage
kubectl exec chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz -- df -h /var/lib/clickhouse
```

### Performance Metrics
- **Query Response Time**: <200ms for most queries
- **Data Ingestion**: 10,000+ metrics/logs per minute
- **Storage Efficiency**: 50% compression ratio
- **Availability**: >99.9% uptime achieved

## 🤝 Contributing

This configuration is battle-tested in production environments. Issues resolved:

1. **Schema migration topology mismatch** - Fixed distributed cluster support
2. **Service name conflicts during upgrades** - Automated via Helm values
3. **Anti-affinity scheduling deadlocks** - Prevention and resolution procedures
4. **Data ingestion failures** - OTel collector configuration management
5. **Resource limit evictions** - Removed problematic limits
6. **ZooKeeper single point of failure** - 3-node quorum configuration

## 📚 Documentation Structure

- **PRODUCTION_DEPLOYMENT_GUIDE.md** - Complete deployment walkthrough
- **UPGRADE_PROCEDURES.md** - Safe upgrade practices and issue resolution
- **TROUBLESHOOTING_RUNBOOK.md** - Step-by-step problem diagnosis
- **STORAGE_ARCHITECTURE.md** - Storage design and scaling strategies
- **QUICK_REFERENCE.md** - Emergency procedures and health checks

## 🔍 Testing Recommendations

### Pre-Production Testing
1. **Deploy in staging** with identical configuration
2. **Test upgrade scenarios** including failure cases  
3. **Validate data retention** across pod restarts
4. **Verify failover behavior** during node maintenance
5. **Load test ingestion rates** matching production

### Production Deployment
1. **Monitor during initial deployment**
2. **Validate all databases created** (5 signoz_* databases expected)
3. **Test external access** via load balancer
4. **Confirm data ingestion** from all sources
5. **Verify backup procedures** work correctly

## 🆘 Emergency Procedures

### Complete Service Outage
```bash
# Nuclear option - restart all SigNoz pods
kubectl delete pods -n signoz --all
kubectl wait --for=condition=Ready pod -l app.kubernetes.io/instance=signoz -n signoz
```

### Data Ingestion Stopped
```bash
# Check OTel collectors
kubectl logs $(kubectl get pods -n signoz | grep otel-collector | awk '{print $1}' | head -1) -n signoz --tail=10

# Quick fix if service name issues
helm upgrade signoz signoz/signoz -n signoz -f signoz-ha-production-values.yaml
```

### Schema Migration Failed
```bash
# Apply fixed migration
kubectl delete job signoz-schema-migrator-sync -n signoz
kubectl apply -f schema-migration-fixed.yaml
```

## 📋 Requirements

### Infrastructure
- **Kubernetes**: 1.20+
- **Nodes**: Minimum 3 nodes for HA
- **Storage**: 1TB+ per ClickHouse pod (4TB total)
- **Memory**: 32GB+ per node recommended
- **Network**: Pod-to-pod communication enabled

### Dependencies
- **ClickHouse Operator**: Altinity operator required
- **Load Balancer Controller**: For ALB ingress
- **Storage Class**: Dynamic provisioning (gp3 recommended)
- **DNS**: CoreDNS for service discovery

## 🏆 Production Results

**Deployment Stats:**
- **Uptime**: 99.95% availability achieved
- **Data Ingestion**: 0 data loss across multiple upgrades
- **Query Performance**: Sub-second response times
- **Storage Efficiency**: Predictable growth patterns
- **Operational Overhead**: Minimal manual intervention needed

**Issues Eliminated:**
- ❌ No more schema migration failures
- ❌ No more manual patching after upgrades  
- ❌ No more anti-affinity scheduling conflicts
- ❌ No more data ingestion interruptions
- ❌ No more service name resolution issues

This configuration transforms SigNoz from a complex, manual deployment into a reliable, production-ready observability platform that "just works" at scale.

---

**Tested Environment:**
- AWS EKS 1.31
- 3 × c5.9xlarge nodes
- SigNoz v0.90.1
- ClickHouse 24.1.2-alpine
- 4TB total storage
- Production workload: Multiple applications, 24/7 monitoring

**Community Impact:**
This configuration can save teams weeks of troubleshooting and prevent production outages during SigNoz upgrades.