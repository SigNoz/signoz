package rules

import (
	"fmt"
	"github.com/jmoiron/sqlx"
	"go.uber.org/zap"
	"strconv"
	"time"
)

// Data store to capture user alert rule settings
type RuleDB interface {
	// CreateRuleTx stores rule in the db and returns tx and group name (on success)
	CreateRuleTx(rule string) (string, Tx, error)

	// EditRuleTx updates the given rule in the db and returns tx and group name (on success)
	EditRuleTx(rule string, id string) (string, Tx, error)

	// DeleteRuleTx deletes the given rule in the db and returns tx and group name (on success)
	DeleteRuleTx(id string) (string, Tx, error)

	// GetStoredRules fetches the rule definitions from db
	GetStoredRules() ([]StoredRule, error)

	// GetStoredRule for a given ID from DB
	GetStoredRule(id string) (*StoredRule, error)
}

type StoredRule struct {
	Id        int       `json:"id" db:"id"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
	Data      string    `json:"data" db:"data"`
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
func (r *ruleDB) CreateRuleTx(rule string) (string, Tx, error) {

	var groupName string
	var lastInsertId int64

	tx, err := r.Begin()
	if err != nil {
		return groupName, nil, err
	}

	stmt, err := tx.Prepare(`INSERT into rules (updated_at, data) VALUES($1,$2);`)
	if err != nil {
		zap.S().Errorf("Error in preparing statement for INSERT to rules\n", err)
		tx.Rollback()
		return groupName, nil, err
	}

	defer stmt.Close()

	result, err := stmt.Exec(time.Now(), rule)
	if err != nil {
		zap.S().Errorf("Error in Executing prepared statement for INSERT to rules\n", err)
		tx.Rollback() // return an error too, we may want to wrap them
		return groupName, nil, err
	}

	lastInsertId, _ = result.LastInsertId()

	groupName = prepareTaskName(lastInsertId)

	return groupName, tx, nil

}

// EditRuleTx stores a given rule string in database and returns
// task name, sql tx and error (if any)
func (r *ruleDB) EditRuleTx(rule string, id string) (string, Tx, error) {

	var groupName string
	idInt, _ := strconv.Atoi(id)
	if idInt == 0 {
		return groupName, nil, fmt.Errorf("failed to read alert id from parameters")
	}

	groupName = prepareTaskName(int64(idInt))

	// todo(amol): resolve this error - database locked when using
	// edit transaction with sqlx
	// tx, err := r.Begin()
	//if err != nil {
	//	return groupName, tx, err
	//}
	stmt, err := r.Prepare(`UPDATE rules SET updated_at=$1, data=$2 WHERE id=$3;`)
	if err != nil {
		zap.S().Errorf("Error in preparing statement for UPDATE to rules\n", err)
		// tx.Rollback()
		return groupName, nil, err
	}
	defer stmt.Close()

	if _, err := stmt.Exec(time.Now(), rule, idInt); err != nil {
		zap.S().Errorf("Error in Executing prepared statement for UPDATE to rules\n", err)
		// tx.Rollback() // return an error too, we may want to wrap them
		return groupName, nil, err
	}
	return groupName, nil, nil
}

// DeleteRuleTx deletes a given rule with id and returns
// taskname, sql tx and error (if any)
func (r *ruleDB) DeleteRuleTx(id string) (string, Tx, error) {

	idInt, _ := strconv.Atoi(id)
	groupName := prepareTaskName(int64(idInt))

	tx, err := r.Begin()
	if err != nil {
		return groupName, tx, err
	}

	stmt, err := tx.Prepare(`DELETE FROM rules WHERE id=$1;`)

	if err != nil {
		return groupName, tx, err
	}
	defer stmt.Close()

	if _, err := stmt.Exec(idInt); err != nil {
		zap.S().Errorf("Error in Executing prepared statement for DELETE to rules\n", err)
		tx.Rollback() // return an error too, we may want to wrap them
		return groupName, tx, err
	}

	return groupName, tx, nil
}

func (r *ruleDB) GetStoredRules() ([]StoredRule, error) {

	rules := []StoredRule{}

	query := fmt.Sprintf("SELECT id, updated_at, data FROM rules")

	err := r.Select(&rules, query)

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
		return nil, err
	}

	return rules, nil
}

func (r *ruleDB) GetStoredRule(id string) (*StoredRule, error) {
	intId, err := strconv.Atoi(id)
	if err != nil {
		return nil, fmt.Errorf("invalid id parameter")
	}

	rule := &StoredRule{}

	query := fmt.Sprintf("SELECT id, updated_at, data FROM rules WHERE id=%d", intId)
	err = r.Get(rule, query)

	// zap.S().Info(query)

	if err != nil {
		zap.S().Error("Error in processing sql query: ", err)
		return nil, err
	}

	return rule, nil
}
