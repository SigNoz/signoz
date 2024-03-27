package rules

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"github.com/jmoiron/sqlx"
	"go.signoz.io/signoz/pkg/query-service/common"
	"go.uber.org/zap"
)

// Data store to capture user alert rule settings
type RuleDB interface {
	// CreateRuleTx stores rule in the db and returns tx and group name (on success)
	CreateRuleTx(ctx context.Context, rule string) (int64, Tx, error)

	// EditRuleTx updates the given rule in the db and returns tx and group name (on success)
	EditRuleTx(ctx context.Context, rule string, id string) (string, Tx, error)

	// DeleteRuleTx deletes the given rule in the db and returns tx and group name (on success)
	DeleteRuleTx(ctx context.Context, id string) (string, Tx, error)

	// GetStoredRules fetches the rule definitions from db
	GetStoredRules(ctx context.Context) ([]StoredRule, error)

	// GetStoredRule for a given ID from DB
	GetStoredRule(ctx context.Context, id string) (*StoredRule, error)
}

type StoredRule struct {
	Id        int        `json:"id" db:"id"`
	CreatedAt *time.Time `json:"created_at" db:"created_at"`
	CreatedBy *string    `json:"created_by" db:"created_by"`
	UpdatedAt *time.Time `json:"updated_at" db:"updated_at"`
	UpdatedBy *string    `json:"updated_by" db:"updated_by"`
	Data      string     `json:"data" db:"data"`
}

type Tx interface {
	Commit() error
	Rollback() error
}

type ruleDB struct {
	*sqlx.DB
}

// todo: move init methods for creating tables

func newRuleDB(db *sqlx.DB) RuleDB {
	return &ruleDB{
		db,
	}
}

// CreateRuleTx stores a given rule in db and returns task name,
// sql tx and error (if any)
func (r *ruleDB) CreateRuleTx(ctx context.Context, rule string) (int64, Tx, error) {
	var lastInsertId int64

	var userEmail string
	if user := common.GetUserFromContext(ctx); user != nil {
		userEmail = user.Email
	}
	createdAt := time.Now()
	updatedAt := time.Now()
	tx, err := r.Begin()
	if err != nil {
		return lastInsertId, nil, err
	}

	stmt, err := tx.Prepare(`INSERT into rules (created_at, created_by, updated_at, updated_by, data) VALUES($1,$2,$3,$4,$5);`)
	if err != nil {
		zap.L().Error("Error in preparing statement for INSERT to rules", zap.Error(err))
		tx.Rollback()
		return lastInsertId, nil, err
	}

	defer stmt.Close()

	result, err := stmt.Exec(createdAt, userEmail, updatedAt, userEmail, rule)
	if err != nil {
		zap.L().Error("Error in Executing prepared statement for INSERT to rules", zap.Error(err))
		tx.Rollback() // return an error too, we may want to wrap them
		return lastInsertId, nil, err
	}

	lastInsertId, err = result.LastInsertId()
	if err != nil {
		zap.L().Error("Error in getting last insert id for INSERT to rules\n", zap.Error(err))
		tx.Rollback() // return an error too, we may want to wrap them
		return lastInsertId, nil, err
	}

	return lastInsertId, tx, nil
}

// EditRuleTx stores a given rule string in database and returns
// task name, sql tx and error (if any)
func (r *ruleDB) EditRuleTx(ctx context.Context, rule string, id string) (string, Tx, error) {

	var groupName string
	idInt, _ := strconv.Atoi(id)
	if idInt == 0 {
		return groupName, nil, fmt.Errorf("failed to read alert id from parameters")
	}

	var userEmail string
	if user := common.GetUserFromContext(ctx); user != nil {
		userEmail = user.Email
	}
	updatedAt := time.Now()
	groupName = prepareTaskName(int64(idInt))

	// todo(amol): resolve this error - database locked when using
	// edit transaction with sqlx
	// tx, err := r.Begin()
	//if err != nil {
	//	return groupName, tx, err
	//}
	stmt, err := r.Prepare(`UPDATE rules SET updated_by=$1, updated_at=$2, data=$3 WHERE id=$4;`)
	if err != nil {
		zap.L().Error("Error in preparing statement for UPDATE to rules", zap.Error(err))
		// tx.Rollback()
		return groupName, nil, err
	}
	defer stmt.Close()

	if _, err := stmt.Exec(userEmail, updatedAt, rule, idInt); err != nil {
		zap.L().Error("Error in Executing prepared statement for UPDATE to rules", zap.Error(err))
		// tx.Rollback() // return an error too, we may want to wrap them
		return groupName, nil, err
	}
	return groupName, nil, nil
}

// DeleteRuleTx deletes a given rule with id and returns
// taskname, sql tx and error (if any)
func (r *ruleDB) DeleteRuleTx(ctx context.Context, id string) (string, Tx, error) {

	idInt, _ := strconv.Atoi(id)
	groupName := prepareTaskName(int64(idInt))

	// commented as this causes db locked error
	// tx, err := r.Begin()
	// if err != nil {
	// 	return groupName, tx, err
	// }

	stmt, err := r.Prepare(`DELETE FROM rules WHERE id=$1;`)

	if err != nil {
		return groupName, nil, err
	}

	defer stmt.Close()

	if _, err := stmt.Exec(idInt); err != nil {
		zap.L().Error("Error in Executing prepared statement for DELETE to rules", zap.Error(err))
		// tx.Rollback()
		return groupName, nil, err
	}

	return groupName, nil, nil
}

func (r *ruleDB) GetStoredRules(ctx context.Context) ([]StoredRule, error) {

	rules := []StoredRule{}

	query := "SELECT id, created_at, created_by, updated_at, updated_by, data FROM rules"

	err := r.Select(&rules, query)

	if err != nil {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return nil, err
	}

	return rules, nil
}

func (r *ruleDB) GetStoredRule(ctx context.Context, id string) (*StoredRule, error) {
	intId, err := strconv.Atoi(id)
	if err != nil {
		return nil, fmt.Errorf("invalid id parameter")
	}

	rule := &StoredRule{}

	query := fmt.Sprintf("SELECT id, created_at, created_by, updated_at, updated_by, data FROM rules WHERE id=%d", intId)
	err = r.Get(rule, query)

	// zap.L().Info(query)

	if err != nil {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return nil, err
	}

	return rule, nil
}
