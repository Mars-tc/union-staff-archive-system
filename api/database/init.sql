SET client_encoding = 'UTF-8';

CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(30) DEFAULT 'employee' CHECK (role IN ('employee', 'admin', 'grass_root_auditor', 'union_committee_auditor')),
    union_member BOOLEAN DEFAULT FALSE,
    mutual_aid_member BOOLEAN DEFAULT FALSE,
    department VARCHAR(100),
    is_retired BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS union_members (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) UNIQUE NOT NULL,
    position VARCHAR(100),
    join_date DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS membership_applications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) NOT NULL,
    position VARCHAR(100),
    gender VARCHAR(10),
    native_place VARCHAR(100),
    education VARCHAR(50),
    id_card VARCHAR(18),
    hukou_location VARCHAR(200),
    ethnicity VARCHAR(50),
    residence_address VARCHAR(200),
    political_status VARCHAR(50),
    contact_phone VARCHAR(20),
    work_resume TEXT,
    family_members TEXT,
    specialty VARCHAR(200),
    signature TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    remark TEXT,
    grass_root_opinion TEXT,
    grass_root_signature VARCHAR(100),
    grass_root_date DATE,
    union_committee_opinion TEXT,
    union_committee_signature VARCHAR(100),
    union_committee_date DATE,
    auditor_id BIGINT REFERENCES users(id),
    audit_step VARCHAR(20) DEFAULT 'pending' CHECK (audit_step IN ('pending', 'grass_root', 'union_committee', 'completed')),
    tags TEXT DEFAULT '[]',
    marked_as_audited BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fee_authorizations (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) NOT NULL,
    amount DECIMAL(10, 2),
    bank_account VARCHAR(50),
    signature TEXT,
    start_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'active', 'inactive')),
    remark TEXT,
    grass_root_opinion TEXT,
    grass_root_signature VARCHAR(100),
    grass_root_date DATE,
    union_committee_opinion TEXT,
    union_committee_signature VARCHAR(100),
    union_committee_date DATE,
    auditor_id BIGINT REFERENCES users(id),
    audit_step VARCHAR(20) DEFAULT 'pending' CHECK (audit_step IN ('pending', 'grass_root', 'union_committee', 'completed')),
    marked_as_audited BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS disease_types (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(20) CHECK (category IN ('重疾', '慢病', '其他')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS difficulty_applications (
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

CREATE TABLE IF NOT EXISTS user_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) UNIQUE NOT NULL,
    gender VARCHAR(10),
    photo_url TEXT,
    native_place VARCHAR(100),
    id_card VARCHAR(18),
    hukou_location VARCHAR(200),
    residence_address VARCHAR(200),
    work_unit VARCHAR(200),
    position VARCHAR(100),
    ethnicity VARCHAR(50),
    political_status VARCHAR(50),
    work_resume TEXT,
    family_members TEXT,
    specialty VARCHAR(200),
    education VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mutual_aid_applications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) NOT NULL,
    gender VARCHAR(10),
    birth_date DATE,
    political_status VARCHAR(50),
    mobile_phone VARCHAR(20),
    home_phone VARCHAR(20),
    id_card VARCHAR(18),
    department VARCHAR(100),
    position VARCHAR(100),
    home_address VARCHAR(200),
    zip_code VARCHAR(10),
    family_members TEXT,
    work_group_opinion TEXT,
    work_group_signature VARCHAR(100),
    work_group_date DATE,
    office_opinion TEXT,
    office_signature VARCHAR(100),
    office_date DATE,
    signature TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    remark TEXT,
    marked_as_audited BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

CREATE TABLE IF NOT EXISTS password_resets (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    email VARCHAR(255) NOT NULL,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets(email);
CREATE INDEX IF NOT EXISTS idx_password_resets_user_id ON password_resets(user_id);

CREATE INDEX IF NOT EXISTS idx_membership_applications_user_id ON membership_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_membership_applications_status ON membership_applications(status);
CREATE INDEX IF NOT EXISTS idx_membership_applications_audit_step ON membership_applications(audit_step);
CREATE INDEX IF NOT EXISTS idx_membership_applications_created_at ON membership_applications(created_at);

CREATE INDEX IF NOT EXISTS idx_fee_authorizations_user_id ON fee_authorizations(user_id);
CREATE INDEX IF NOT EXISTS idx_fee_authorizations_status ON fee_authorizations(status);
CREATE INDEX IF NOT EXISTS idx_fee_authorizations_created_at ON fee_authorizations(created_at);

CREATE INDEX IF NOT EXISTS idx_difficulty_applications_user_id ON difficulty_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_difficulty_applications_status ON difficulty_applications(status);
CREATE INDEX IF NOT EXISTS idx_difficulty_applications_audit_step ON difficulty_applications(audit_step);
CREATE INDEX IF NOT EXISTS idx_difficulty_applications_disease_type ON difficulty_applications(disease_type_id);
CREATE INDEX IF NOT EXISTS idx_difficulty_applications_created_at ON difficulty_applications(created_at);

CREATE INDEX IF NOT EXISTS idx_mutual_aid_applications_user_id ON mutual_aid_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_mutual_aid_applications_status ON mutual_aid_applications(status);
CREATE INDEX IF NOT EXISTS idx_mutual_aid_applications_created_at ON mutual_aid_applications(created_at);

CREATE INDEX IF NOT EXISTS idx_mutual_aid_difficulty_user_id ON mutual_aid_difficulty_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_mutual_aid_difficulty_status ON mutual_aid_difficulty_applications(status);
CREATE INDEX IF NOT EXISTS idx_mutual_aid_difficulty_audit_step ON mutual_aid_difficulty_applications(audit_step);
CREATE INDEX IF NOT EXISTS idx_mutual_aid_difficulty_created_at ON mutual_aid_difficulty_applications(created_at);

CREATE TABLE IF NOT EXISTS system_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100),
    resource_id BIGINT,
    details TEXT,
    ip_address VARCHAR(50),
    user_agent VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON system_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_action ON system_logs(action);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at);

CREATE TABLE IF NOT EXISTS modules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description VARCHAR(255),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_modules (
    id SERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) NOT NULL,
    module_id INTEGER REFERENCES modules(id) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, module_id)
);

INSERT INTO disease_types (name, category) VALUES
('恶性肿瘤', '重疾'),
('严重心血管疾病', '重疾'),
('慢性肾功能衰竭', '重疾'),
('严重肝病', '重疾'),
('糖尿病', '慢病'),
('高血压', '慢病'),
('心脏病', '慢病'),
('其他疾病', '其他')
ON CONFLICT DO NOTHING;

INSERT INTO modules (name, code, description, sort_order) VALUES
('任务管理', 'tasks', '查看审核任务统计', 1),
('入会审核', 'membership_audit', '审核入会申请', 2),
('会费审核', 'fee_audit', '审核会费授权', 3),
('互助会审核', 'mutual_aid_audit', '审核爱心互助会申请', 4),
('爱心帮扶审批', 'mutual_aid_difficulty_audit', '审核爱心帮扶申请', 5),
('用户管理', 'user_management', '管理系统用户', 6),
('系统日志', 'system_logs', '查看系统操作日志', 7),
('查询统计', 'statistics', '查看各类统计报表', 8)
ON CONFLICT (code) DO NOTHING;

INSERT INTO users (email, password, name, phone, role) VALUES
('admin@union.com', '$2b$10$OTu//AF4gJThXXuTawopq.41QRXrtoj3IDwmNX0U6Z3fRfx/K9PPS', '系统管理员', '13800138000', 'admin'),
('grass_root@union.com', '$2b$10$OTu//AF4gJThXXuTawopq.41QRXrtoj3IDwmNX0U6Z3fRfx/K9PPS', '基层审核人', '13800138001', 'grass_root_auditor'),
('committee@union.com', '$2b$10$OTu//AF4gJThXXuTawopq.41QRXrtoj3IDwmNX0U6Z3fRfx/K9PPS', '委员会审核人', '13800138002', 'union_committee_auditor'),
('employee@union.com', '$2b$10$OTu//AF4gJThXXuTawopq.41QRXrtoj3IDwmNX0U6Z3fRfx/K9PPS', '普通职工', '13800138000', 'employee')
ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, role = EXCLUDED.role;