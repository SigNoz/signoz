package authtypes

import (
	"github.com/SigNoz/signoz/pkg/types/coretypes"
)

// Registry wraps the coretypes Registry and is the authz-aware view consumed
// by the authz providers. It exposes the same static schema and adds any
// authz-specific lookups built on top of it. Managed-role transactions are
// bridged once here from coretypes.Transaction (data shape) to *Transaction
// (operational shape with ID + TransactionKey).
type Registry struct {
	coretypes                 *coretypes.Registry
	transactions              map[string][]*Transaction
	managedRolesByTransaction map[string][]string
}

func NewRegistry() *Registry {
	coreRegistry := coretypes.NewRegistry()
	transactions := buildManagedRoleTransactions(coreRegistry.ManagedRoleTransactions())
	return &Registry{
		coretypes:                 coreRegistry,
		transactions:              transactions,
		managedRolesByTransaction: buildManagedRolesByTransaction(transactions),
	}
}

func (registry *Registry) Types() []coretypes.Type {
	return registry.coretypes.Types()
}

func (registry *Registry) Resources() []coretypes.Resource {
	return registry.coretypes.Resources()
}

func (registry *Registry) ManagedRoles() []string {
	return registry.coretypes.ManagedRoles()
}

func (registry *Registry) ManagedRoleTransactions() map[string][]*Transaction {
	return registry.transactions
}

// ManagedRolesByTransaction returns the inverse of ManagedRoleTransactions:
// keyed by Transaction.TransactionKey() ("verb:type:kind"), value is the list
// of managed-role names that hold that transaction. Used by the BatchCheck
// flow to expand a request transaction into role-assignee correlation checks.
func (registry *Registry) ManagedRolesByTransaction() map[string][]string {
	return registry.managedRolesByTransaction
}

func buildManagedRoleTransactions(input map[string][]coretypes.Transaction) map[string][]*Transaction {
	out := make(map[string][]*Transaction, len(input))
	for roleName, txns := range input {
		converted := make([]*Transaction, 0, len(txns))
		for _, txn := range txns {
			authzTxn, err := NewTransaction(Relation{Verb: txn.Verb}, txn.Object)
			if err != nil {
				panic(err)
			}
			converted = append(converted, authzTxn)
		}
		out[roleName] = converted
	}
	return out
}

func buildManagedRolesByTransaction(transactions map[string][]*Transaction) map[string][]string {
	out := make(map[string][]string)
	for roleName, txns := range transactions {
		for _, txn := range txns {
			key := txn.TransactionKey()
			out[key] = append(out[key], roleName)
		}
	}
	return out
}
