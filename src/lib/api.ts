import { useAuthStore } from '../store/auth'

const API_BASE_URL = '/api'

export const api = {
  auth: {
    login: async (account: string, password: string) => {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account, password }),
      })
      return response.json()
    },
    register: async (email: string, password: string, name: string, phone?: string) => {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, phone }),
      })
      return response.json()
    },
    getMe: async () => {
      const token = useAuthStore.getState().token
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return response.json()
    },
    updateMe: async (data: { 
      name: string; 
      phone: string; 
      email: string;
      is_retired?: boolean;
      gender?: string;
      photo_url?: string;
      native_place?: string;
      id_card?: string;
      hukou_location?: string;
      residence_address?: string;
      work_unit?: string;
      position?: string;
      ethnicity?: string;
      political_status?: string;
      work_resume?: string;
      family_members?: string;
      specialty?: string;
    }) => {
      const token = useAuthStore.getState().token
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      })
      return response.json()
    },
    changePassword: async (currentPassword: string, newPassword: string) => {
      const token = useAuthStore.getState().token
      const response = await fetch(`${API_BASE_URL}/auth/me/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      return response.json()
    },
    // 忘记密码：发送验证码到邮箱
    forgotPassword: async (email: string) => {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      return response.json()
    },
    // 重置密码：校验验证码并设置新密码
    resetPassword: async (email: string, code: string, newPassword: string) => {
      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword }),
      })
      return response.json()
    },
  },
  membership: {
    apply: async (data: { 
      employee_id: string; 
      department: string; 
      position: string; 
      signature: string;
      gender?: string;
      native_place?: string;
      education?: string;
      id_card?: string;
      hukou_location?: string;
      ethnicity?: string;
      residence_address?: string;
      political_status?: string;
      contact_phone?: string;
      work_resume?: string;
      family_members?: string;
      specialty?: string;
    }) => {
      const token = useAuthStore.getState().token
      const response = await fetch(`${API_BASE_URL}/membership/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      })
      return response.json()
    },
    getApplications: async (status?: string, mine?: boolean) => {
      const token = useAuthStore.getState().token
      const params: string[] = []
      if (status) params.push(`status=${status}`)
      if (mine) params.push('mine=true')
      const queryString = params.length > 0 ? `?${params.join('&')}` : ''
      const response = await fetch(`${API_BASE_URL}/membership/applications${queryString}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return response.json()
    },
    getApplication: async (id: number) => {
      const token = useAuthStore.getState().token
      const response = await fetch(`${API_BASE_URL}/membership/applications/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return response.json()
    },
    updateApplication: async (id: number, data: {
      status: 'pending' | 'approved' | 'rejected';
      remark?: string;
      grass_root_opinion?: string;
      grass_root_signature?: string;
      grass_root_date?: string;
      union_committee_opinion?: string;
      union_committee_signature?: string;
      union_committee_date?: string;
      audit_step?: string;
      tags?: string;
    }) => {
      const token = useAuthStore.getState().token
      const response = await fetch(`${API_BASE_URL}/membership/applications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        throw new Error('请求失败')
      }
      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || '操作失败')
      }
      return result
    },
    batchAuditApplications: async (ids: number[], data: {
      status: 'approved' | 'rejected';
      remark?: string;
      grass_root_opinion?: string;
      grass_root_signature?: string;
      grass_root_date?: string;
      union_committee_opinion?: string;
      union_committee_signature?: string;
      union_committee_date?: string;
    }) => {
      const token = useAuthStore.getState().token
      const response = await fetch(`${API_BASE_URL}/membership/applications/batch`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ids, ...data }),
      })
      return response.json()
    },
    updateApplicationTags: async (id: number, tags: string[]) => {
      const token = useAuthStore.getState().token
      const response = await fetch(`${API_BASE_URL}/membership/applications/${id}/tags`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tags: JSON.stringify(tags) }),
      })
      return response.json()
    },
    markAsAudited: async (id: number, marked_as_audited: boolean) => {
      const token = useAuthStore.getState().token
      const response = await fetch(`${API_BASE_URL}/membership/applications/${id}/mark-as-audited`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ marked_as_audited }),
      })
      return response.json()
    },
    batchMarkAsAudited: async (ids: number[], marked_as_audited: boolean) => {
      const token = useAuthStore.getState().token
      const response = await fetch(`${API_BASE_URL}/membership/applications/batch/mark-as-audited`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ids, marked_as_audited }),
      })
      return response.json()
    },
  },
  fee: {
    authorize: async (data: { signature: string; start_date: string }) => {
      const token = useAuthStore.getState().token
      const response = await fetch(`${API_BASE_URL}/fee/authorize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      })
      return response.json()
    },
    getAuthorizations: async (status?: string, mine?: boolean) => {
      const token = useAuthStore.getState().token
      const params: string[] = []
      if (status) params.push(`status=${status}`)
      if (mine) params.push('mine=true')
      const queryString = params.length > 0 ? `?${params.join('&')}` : ''
      const response = await fetch(`${API_BASE_URL}/fee/authorizations${queryString}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return response.json()
    },
    getAuthorization: async (id: number) => {
      const token = useAuthStore.getState().token
      const response = await fetch(`${API_BASE_URL}/fee/authorizations/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return response.json()
    },
    updateAuthorization: async (id: number, data: {
      status?: 'pending' | 'approved' | 'rejected';
      remark?: string;
      grass_root_opinion?: string;
      grass_root_signature?: string;
      grass_root_date?: string;
      union_committee_opinion?: string;
      union_committee_signature?: string;
      union_committee_date?: string;
      audit_step?: string;
      start_date?: string;
    }) => {
      const token = useAuthStore.getState().token
      const response = await fetch(`${API_BASE_URL}/fee/authorizations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        throw new Error('请求失败')
      }
      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || '操作失败')
      }
      return result
    },
  },
  difficulty: {
    apply: async (data: { disease_type_id?: number; amount: number; reason: string; signature: string; difficulty_category: string; family_income?: number; family_members?: string; bank_account?: string; bank_name?: string; bank_account_name?: string; create_mutual_aid?: boolean }) => {
      const token = useAuthStore.getState().token
      const response = await fetch(`${API_BASE_URL}/difficulty/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      })
      return response.json()
    },
    uploadDocument: async (id: number, file: File) => {
      const token = useAuthStore.getState().token
      const formData = new FormData()
      formData.append('document', file)
      const response = await fetch(`${API_BASE_URL}/difficulty/upload-document/${id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      return response.json()
    },
    checkDuplicate: async (disease_type_id: number, target_user_id?: number) => {
      const token = useAuthStore.getState().token
      let url = `${API_BASE_URL}/difficulty/check-duplicate?disease_type_id=${disease_type_id}`
      if (target_user_id) {
        url += `&target_user_id=${target_user_id}`
      }
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return response.json()
    },
    getApplications: async (status?: string, disease_type_id?: number, difficulty_category?: string, audit_step?: string) => {
      const token = useAuthStore.getState().token
      let params = '?'
      if (status) params += `status=${status}&`
      if (disease_type_id) params += `disease_type_id=${disease_type_id}&`
      if (difficulty_category) params += `difficulty_category=${difficulty_category}&`
      if (audit_step) params += `audit_step=${audit_step}&`
      const query = params !== '?' ? params.slice(0, -1) : ''
      const response = await fetch(`${API_BASE_URL}/difficulty/applications${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return response.json()
    },
    getApplication: async (id: number) => {
      const token = useAuthStore.getState().token
      const response = await fetch(`${API_BASE_URL}/difficulty/applications/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return response.json()
    },
    getRecords: async () => {
      const token = useAuthStore.getState().token
      const response = await fetch(`${API_BASE_URL}/difficulty/records`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return response.json()
    },
    getUserApplications: async () => {
      const token = useAuthStore.getState().token
      const response = await fetch(`${API_BASE_URL}/difficulty/user-applications`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return response.json()
    },
    updateApplication: async (id: number, data: {
      status?: 'approved' | 'rejected';
      remark?: string;
      grass_root_opinion?: string;
      grass_root_signature?: string;
      grass_root_date?: string;
      union_committee_opinion?: string;
      union_committee_signature?: string;
      union_committee_date?: string;
      audit_step?: string;
      actual_amount?: number;
    }) => {
      const token = useAuthStore.getState().token
      const response = await fetch(`${API_BASE_URL}/difficulty/applications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        throw new Error('请求失败')
      }
      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || '操作失败')
      }
      return result
    },
    getDiseaseTypes: async () => {
      const token = useAuthStore.getState().token
      const response = await fetch(`${API_BASE_URL}/difficulty/disease-types`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return response.json()
    },
    getCategories: async () => {
      const token = useAuthStore.getState().token
      const response = await fetch(`${API_BASE_URL}/difficulty/categories`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return response.json()
    },
    markAsAudited: async (id: number, marked_as_audited: boolean) => {
      const token = useAuthStore.getState().token
      const response = await fetch(`${API_BASE_URL}/difficulty/applications/${id}/mark-as-audited`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ marked_as_audited }),
      })
      return response.json()
    },
    batchMarkAsAudited: async (ids: number[], marked_as_audited: boolean) => {
      const token = useAuthStore.getState().token
      const response = await fetch(`${API_BASE_URL}/difficulty/applications/batch/mark-as-audited`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ids, marked_as_audited }),
      })
      return response.json()
    },
    getStats: async () => {
      const token = useAuthStore.getState().token
      const response = await fetch(`${API_BASE_URL}/difficulty/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return response.json()
    },
    importPreview: async (file: File) => {
      const token = useAuthStore.getState().token
      const formData = new FormData()
      formData.append('file', file)
      const response = await fetch(`${API_BASE_URL}/difficulty/import/preview`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      return response.json()
    },
    importRecords: async (file: File, createUsers: boolean = false) => {
      const token = useAuthStore.getState().token
      const formData = new FormData()
      formData.append('file', file)
      formData.append('createUsers', String(createUsers))
      const response = await fetch(`${API_BASE_URL}/difficulty/import`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      return response.json()
    },
  },
  users: {
    getUsers: async (params?: { search?: string; role?: string; union_member?: boolean; mutual_aid_member?: boolean; is_retired?: boolean }) => {
      const token = useAuthStore.getState().token
      let query = '?'
      if (params?.search) query += `search=${encodeURIComponent(params.search)}&`
      if (params?.role) query += `role=${params.role}&`
      if (params?.union_member !== undefined) query += `union_member=${params.union_member}&`
      if (params?.mutual_aid_member !== undefined) query += `mutual_aid_member=${params.mutual_aid_member}&`
      if (params?.is_retired !== undefined) query += `is_retired=${params.is_retired}&`
      const url = `${API_BASE_URL}/users${query !== '?' ? query.slice(0, -1) : ''}`
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return response.json()
    },
    createUser: async (data: { email: string; password: string; name: string; phone?: string; role?: string; is_retired?: boolean }) => {
      const token = useAuthStore.getState().token
      const response = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      })
      return response.json()
    },
    batchCreateUsers: async (users: Array<{ email: string; name: string; phone?: string; role?: string; is_retired?: boolean }>) => {
      const token = useAuthStore.getState().token
      const response = await fetch(`${API_BASE_URL}/users/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ users }),
      })
      return response.json()
    },
    batchUpdateUsers: async (ids: number[], data: { role?: string; union_member?: boolean; mutual_aid_member?: boolean; is_retired?: boolean }) => {
      const token = useAuthStore.getState().token
      const response = await fetch(`${API_BASE_URL}/users/batch`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ids, ...data }),
      })
      return response.json()
    },
    batchDeleteUsers: async (ids: number[]) => {
      const token = useAuthStore.getState().token
      const response = await fetch(`${API_BASE_URL}/users/batch`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ids }),
      })
      return response.json()
    },
    updateUser: async (id: number, data: { name: string; phone?: string; role: string; is_retired?: boolean }) => {
      const token = useAuthStore.getState().token
      const response = await fetch(`${API_BASE_URL}/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      })
      return response.json()
    },
    deleteUser: async (id: number) => {
      const token = useAuthStore.getState().token
      const response = await fetch(`${API_BASE_URL}/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      return response.json()
    },
    getRoleOptions: () => {
      return [
        { value: 'employee', label: '普通职工' },
        { value: 'admin', label: '管理员' },
        { value: 'grass_root_auditor', label: '基层审核人' },
        { value: 'union_committee_auditor', label: '委员会审核人' },
      ]
    },
  },
  tasks: {
    getTodo: async () => {
      const token = useAuthStore.getState().token
      const response = await fetch(`${API_BASE_URL}/tasks/todo`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return response.json()
    },
    getDone: async () => {
      const token = useAuthStore.getState().token
      const response = await fetch(`${API_BASE_URL}/tasks/done`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return response.json()
    },
    getStats: async () => {
      const token = useAuthStore.getState().token
      const response = await fetch(`${API_BASE_URL}/tasks/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return response.json()
    },
  },
  logs: {
    getLogs: async (params?: { page?: number; limit?: number; action?: string; userId?: number; startDate?: string; endDate?: string }) => {
      const token = useAuthStore.getState().token
      let query = '?'
      if (params?.page) query += `page=${params.page}&`
      if (params?.limit) query += `limit=${params.limit}&`
      if (params?.action) query += `action=${params.action}&`
      if (params?.userId) query += `userId=${params.userId}&`
      if (params?.startDate) query += `startDate=${params.startDate}&`
      if (params?.endDate) query += `endDate=${params.endDate}&`
      const url = `${API_BASE_URL}/logs${query !== '?' ? query.slice(0, -1) : ''}`
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return response.json()
    },
    getLog: async (id: number) => {
      const token = useAuthStore.getState().token
      const response = await fetch(`${API_BASE_URL}/logs/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return response.json()
    },
    deleteLog: async (id: number) => {
      const token = useAuthStore.getState().token
      const response = await fetch(`${API_BASE_URL}/logs/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      return response.json()
    },
    batchDeleteLogs: async (ids: number[]) => {
      const token = useAuthStore.getState().token
      const response = await fetch(`${API_BASE_URL}/logs/batch`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ids }),
      })
      return response.json()
    },
  },
  mutualAid: {
    apply: async (data: {
      gender: string;
      birth_date?: string;
      political_status?: string;
      mobile_phone?: string;
      home_phone?: string;
      id_card: string;
      department: string;
      position: string;
      home_address?: string;
      zip_code?: string;
      family_members?: string;
      signature: string;
    }) => {
      const token = useAuthStore.getState().token
      const response = await fetch(`${API_BASE_URL}/mutual-aid/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      })
      return response.json()
    },
    getApplications: async (status?: string) => {
      const token = useAuthStore.getState().token
      const params = status ? `?status=${status}` : ''
      const response = await fetch(`${API_BASE_URL}/mutual-aid/applications${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return response.json()
    },
    getApplication: async (id: number) => {
      const token = useAuthStore.getState().token
      const response = await fetch(`${API_BASE_URL}/mutual-aid/applications/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return response.json()
    },
    updateApplication: async (id: number, data: {
      status: 'pending' | 'approved' | 'rejected';
      remark?: string;
      work_group_opinion?: string;
      work_group_signature?: string;
      work_group_date?: string;
      office_opinion?: string;
      office_signature?: string;
      office_date?: string;
    }) => {
      const token = useAuthStore.getState().token
      const response = await fetch(`${API_BASE_URL}/mutual-aid/applications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        throw new Error('请求失败')
      }
      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || '操作失败')
      }
      return result
    },
    markAsAudited: async (id: number, marked_as_audited: boolean) => {
      const token = useAuthStore.getState().token
      const response = await fetch(`${API_BASE_URL}/mutual-aid/applications/${id}/mark-as-audited`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ marked_as_audited }),
      })
      return response.json()
    },
    batchMarkAsAudited: async (ids: number[], marked_as_audited: boolean) => {
      const token = useAuthStore.getState().token
      const response = await fetch(`${API_BASE_URL}/mutual-aid/applications/batch/mark-as-audited`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ids, marked_as_audited }),
      })
      return response.json()
    },
  },
  mutualAidDifficulty: {
    apply: async (data: { disease_type_id?: number; amount: number; reason: string; signature: string; difficulty_category: string; family_income?: number; family_members?: string; bank_account?: string; bank_name?: string; bank_account_name?: string }) => {
      const token = useAuthStore.getState().token
      const response = await fetch(`${API_BASE_URL}/mutual-aid-difficulty/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      })
      return response.json()
    },
    uploadDocument: async (id: number, file: File) => {
      const token = useAuthStore.getState().token
      const formData = new FormData()
      formData.append('document', file)
      const response = await fetch(`${API_BASE_URL}/mutual-aid-difficulty/upload-document/${id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      return response.json()
    },
    checkDuplicate: async (disease_type_id: number, target_user_id?: number) => {
      const token = useAuthStore.getState().token
      let url = `${API_BASE_URL}/mutual-aid-difficulty/check-duplicate?disease_type_id=${disease_type_id}`
      if (target_user_id) {
        url += `&target_user_id=${target_user_id}`
      }
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return response.json()
    },
    getApplications: async (status?: string, disease_type_id?: number, difficulty_category?: string, audit_step?: string, marked_as_audited?: string) => {
      const token = useAuthStore.getState().token
      let params = '?'
      if (status) params += `status=${status}&`
      if (disease_type_id) params += `disease_type_id=${disease_type_id}&`
      if (difficulty_category) params += `difficulty_category=${difficulty_category}&`
      if (audit_step) params += `audit_step=${audit_step}&`
      if (marked_as_audited) params += `marked_as_audited=${marked_as_audited}&`
      const query = params !== '?' ? params.slice(0, -1) : ''
      const response = await fetch(`${API_BASE_URL}/mutual-aid-difficulty/applications${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return response.json()
    },
    getApplication: async (id: number) => {
      const token = useAuthStore.getState().token
      const response = await fetch(`${API_BASE_URL}/mutual-aid-difficulty/applications/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return response.json()
    },
    updateApplication: async (id: number, data: {
      status?: 'approved' | 'rejected';
      remark?: string;
      grass_root_opinion?: string;
      grass_root_signature?: string;
      grass_root_date?: string;
      union_committee_opinion?: string;
      union_committee_signature?: string;
      union_committee_date?: string;
      audit_step?: string;
      actual_amount?: number;
    }) => {
      const token = useAuthStore.getState().token
      const response = await fetch(`${API_BASE_URL}/mutual-aid-difficulty/applications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        throw new Error('请求失败')
      }
      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || '操作失败')
      }
      return result
    },
    getDiseaseTypes: async () => {
      const token = useAuthStore.getState().token
      const response = await fetch(`${API_BASE_URL}/mutual-aid-difficulty/disease-types`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return response.json()
    },
    getCategories: async () => {
      const token = useAuthStore.getState().token
      const response = await fetch(`${API_BASE_URL}/mutual-aid-difficulty/categories`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return response.json()
    },
    markAsAudited: async (id: number, marked_as_audited: boolean) => {
      const token = useAuthStore.getState().token
      const response = await fetch(`${API_BASE_URL}/mutual-aid-difficulty/applications/${id}/mark-as-audited`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ marked_as_audited }),
      })
      return response.json()
    },
    batchMarkAsAudited: async (ids: number[], marked_as_audited: boolean) => {
      const token = useAuthStore.getState().token
      const response = await fetch(`${API_BASE_URL}/mutual-aid-difficulty/applications/batch/mark-as-audited`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ids, marked_as_audited }),
      })
      return response.json()
    },
    getStats: async () => {
      const token = useAuthStore.getState().token
      const response = await fetch(`${API_BASE_URL}/mutual-aid-difficulty/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return response.json()
    },
  },
  modules: {
    getModules: async () => {
      const token = useAuthStore.getState().token
      const response = await fetch(`${API_BASE_URL}/modules`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return response.json()
    },
    getUserModules: async (userId: number) => {
      const token = useAuthStore.getState().token
      const response = await fetch(`${API_BASE_URL}/modules/user/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return response.json()
    },
    updateUserModules: async (userId: number, modules: string[]) => {
      const token = useAuthStore.getState().token
      const response = await fetch(`${API_BASE_URL}/modules/user/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ modules }),
      })
      return response.json()
    },
    batchUpdateUserModules: async (userIds: number[], modules: string[]) => {
      const token = useAuthStore.getState().token
      const response = await fetch(`${API_BASE_URL}/modules/user/batch`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userIds, modules }),
      })
      return response.json()
    },
  },
}
