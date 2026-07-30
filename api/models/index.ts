export interface User {
  id: number
  email: string
  password: string
  name: string
  phone: string
  department: string | null
  role: 'employee' | 'admin' | 'grass_root_auditor' | 'union_committee_auditor'
  union_member: boolean
  mutual_aid_member: boolean
  is_retired: boolean
  created_at: Date
  updated_at: Date
}

export interface UnionMember {
  id: number
  user_id: number
  position: string
  join_date: Date
  status: 'active' | 'inactive'
  created_at: Date
  updated_at: Date
}

export interface MembershipApplication {
  id: number
  user_id: number
  position: string
  gender: string
  native_place: string
  education: string
  id_card: string
  hukou_location: string
  ethnicity: string
  residence_address: string
  political_status: string
  contact_phone: string
  work_resume: string
  family_members: string
  specialty: string
  signature: string
  status: 'pending' | 'approved' | 'rejected'
  remark: string
  grass_root_opinion: string | null
  grass_root_signature: string | null
  grass_root_date: Date | null
  union_committee_opinion: string | null
  union_committee_signature: string | null
  union_committee_date: Date | null
  auditor_id: number | null
  audit_step: 'pending' | 'grass_root' | 'union_committee' | 'completed'
  tags: string
  created_at: Date
  updated_at: Date
}

export interface FeeAuthorization {
  id: number
  user_id: number
  amount: number | null
  bank_account: string | null
  signature: string
  start_date: Date
  end_date: Date | null
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'inactive'
  remark: string | null
  grass_root_opinion: string | null
  grass_root_signature: string | null
  grass_root_date: Date | null
  union_committee_opinion: string | null
  union_committee_signature: string | null
  union_committee_date: Date | null
  auditor_id: number | null
  audit_step: 'pending' | 'grass_root' | 'union_committee' | 'completed'
  created_at: Date
  updated_at: Date
}

export interface DiseaseType {
  id: number
  name: string
  category: '重疾' | '慢病' | '其他'
  created_at: Date
}

export interface DifficultyApplication {
  id: number
  user_id: number
  disease_type_id: number | null
  amount: number
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  signature: string
  remark: string
  difficulty_category: 'disability' | 'accident' | 'disease' | 'education' | 'special'
  family_income: number | null
  family_members: string | null
  bank_account: string | null
  bank_name: string | null
  bank_account_name: string | null
  document_path: string | null
  grass_root_opinion: string | null
  grass_root_signature: string | null
  grass_root_date: Date | null
  union_committee_opinion: string | null
  union_committee_signature: string | null
  union_committee_date: Date | null
  auditor_id: number | null
  audit_step: 'pending' | 'grass_root' | 'union_committee' | 'completed'
  actual_amount: number | null
  personal_income: number | null
  dependents_count: number | null
  is_retired: boolean
  is_one_time: boolean
  apply_count: number
  employee_id: string | null
  applied_before: boolean
  created_at: Date
  updated_at: Date
}

export interface MutualAidApplication {
  id: number
  user_id: number
  gender: string
  birth_date: Date
  political_status: string
  mobile_phone: string
  home_phone: string
  id_card: string
  department: string
  position: string
  home_address: string
  zip_code: string
  family_members: string
  work_group_opinion: string
  work_group_signature: string
  work_group_date: Date
  office_opinion: string
  office_signature: string
  office_date: Date
  signature: string
  status: 'pending' | 'approved' | 'rejected'
  remark: string
  created_at: Date
  updated_at: Date
}
