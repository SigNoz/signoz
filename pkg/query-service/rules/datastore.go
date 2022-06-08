package rules

import (
	"go.signoz.io/query-service/model"
	"go.uber.org/zap"
)

// Data store to capture user alert rule settings
type RuleDB interface {
	// CreateRuleTx stores rule in the db and returns tx and group name (on success)
	CreateRuleTx(rule string) (string, Tx, error)

	// EditRuleTx updates the given rule in the db and returns tx and group name (on success)
	EditRuleTx(rule string, id string) (string, Tx, error)

	// DeleteRuleTx deletes the given rule in the db and returns tx and group name (on success)
	DeleteRuleTx(id string) (string, Tx, error)

	// GetRules fetches the rule definitions from db
	GetRules() (*[]model.RuleResponseItem, error)
}

type Tx interface {
	Commit() error
	Rollback() error
}

type ruleDB struct {
	*sqlx.DB
}

func newRuleDB(db *sqlx.DB) RuleDB {
	return ruleDB{
		db,
	}
}

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

	groupName = fmt.Sprintf("%d-groupname", lastInsertId)

	return groupName, tx, nil

}

func (r *ruleDB) EditRuleTx(rule string, id string) (string, Tx, error) {
	var groupName string
	idInt, _ := strconv.Atoi(id)
	groupName = fmt.Sprintf("%d-groupname", idInt)

	tx, err := r.Begin()
	if err != nil {
		return groupName, err
	}

	stmt, err := tx.Prepare(`UPDATE rules SET updated_at=$1, data=$2 WHERE id=$3;`)
	if err != nil {
		zap.S().Errorf("Error in preparing statement for UPDATE to rules\n", err)
		tx.Rollback()
		return groupName, err
	}
	defer stmt.Close()

	if _, err := stmt.Exec(time.Now(), rule, idInt); err != nil {
		zap.S().Errorf("Error in Executing prepared statement for UPDATE to rules\n", err)
		tx.Rollback() // return an error too, we may want to wrap them
		return groupName, err
	}

	//		err = r.ruleManager.EditGroup(time.Duration(r.promConfig.GlobalConfig.EvaluationInterval), rule, groupName)

	//	if err != nil {
	//	tx.Rollback()
	//	return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	//}

	return groupName, tx, nil
}

func (r *ruleDB) DeleteRuleTx(id string) (string, Tx, error) {

	idInt, _ := strconv.Atoi(id)

	tx, err := r.Begin()
	if err != nil {
		return nil, err
	}

	stmt, err := tx.Prepare(`DELETE FROM rules WHERE id=$1;`)

	if err != nil {
		return nil, err
	}
	defer stmt.Close()

	if _, err := stmt.Exec(idInt); err != nil {
		zap.S().Errorf("Error in Executing prepared statement for DELETE to rules\n", err)
		tx.Rollback() // return an error too, we may want to wrap them
		return nil, err
	}

	groupName := fmt.Sprintf("%d-groupname", idInt)

	return groupName, tx, nil
}

func (r *ruleDB) GetRules() ([]model.RuleResponseItem{}, error){

	rules := []model.RuleResponseItem{}

	query := fmt.Sprintf("SELECT id, updated_at, data FROM rules")

	err := r.Select(&rules, query)

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
		return nil, err
	}

	return rules, nil
}

type MetricsDB interface {
}
