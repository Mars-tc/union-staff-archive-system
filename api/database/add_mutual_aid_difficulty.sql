-- 添加爱心帮扶申请表
-- 使用方法: 在项目根目录执行: set PGCLIENTENCODING=UTF8 && psql -U postgres -d union_staff -f api/database/add_mutual_aid_difficulty.sql

\set client_encoding 'UTF8'

CREATE TABLE IF NOT EXISTS mutual_aid_difficulty_applications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) NOT NULL,
    disease_type_id BIGINT REFERENCES disease_types(id),
    amount DECIMAL(10, 2) NOT NULL,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    signature TEXT,
    remark TEXT,
    difficulty_category VARCHAR(50) DEFAULT 'disease' CHECK (difficulty_category IN ('disability', 'accident', 'disease', 'education', 'special', 'other')),
    family_income DECIMAL(12, 2),
    family_members TEXT,
    bank_account VARCHAR(50),
    bank_name VARCHAR(100),
    bank_account_name VARCHAR(100),
    document_path VARCHAR(255),
    grass_root_opinion TEXT,
    grass_root_signature VARCHAR(100),
    grass_root_date DATE,
    union_committee_opinion TEXT,
    union_committee_signature VARCHAR(100),
    union_committee_date DATE,
    auditor_id BIGINT REFERENCES users(id),
    audit_step VARCHAR(20) DEFAULT 'pending' CHECK (audit_step IN ('pending', 'grass_root', 'union_committee', 'completed')),
    actual_amount DECIMAL(10, 2),
    personal_income DECIMAL(12, 2),
    dependents_count INTEGER,
    is_retired BOOLEAN DEFAULT FALSE,
    is_one_time BOOLEAN DEFAULT FALSE,
    apply_count INTEGER DEFAULT 0,
    employee_id VARCHAR(50),
    applied_before BOOLEAN DEFAULT FALSE,
    marked_as_audited BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mutual_aid_difficulty_user_id ON mutual_aid_difficulty_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_mutual_aid_difficulty_status ON mutual_aid_difficulty_applications(status);
CREATE INDEX IF NOT EXISTS idx_mutual_aid_difficulty_audit_step ON mutual_aid_difficulty_applications(audit_step);
CREATE INDEX IF NOT EXISTS idx_mutual_aid_difficulty_created_at ON mutual_aid_difficulty_applications(created_at);

SELECT '爱心帮扶申请表创建完成' AS result;
