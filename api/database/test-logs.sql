SET client_encoding = 'UTF-8';

INSERT INTO system_logs (user_id, action, resource, resource_id, details, ip_address, user_agent, created_at) VALUES
(1, 'login', 'users', 1, '系统管理员登录系统', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', '2026-07-15 10:30:00'),
(1, 'create_user', 'users', 2, '创建用户: 张三', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', '2026-07-15 11:15:00'),
(1, 'update_user', 'users', 2, '更新用户: 张三', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', '2026-07-15 14:20:00'),
(1, 'batch_create_users', 'users', NULL, '批量创建用户: 5 个', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', '2026-07-15 15:45:00'),
(1, 'login', 'users', 1, '系统管理员登录系统', '192.168.1.100', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', '2026-07-16 09:00:00'),
(1, 'update_profile', 'users', 1, '更新个人信息', '192.168.1.100', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', '2026-07-16 10:30:00'),
(1, 'change_password', 'users', 1, '修改密码', '192.168.1.100', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', '2026-07-16 11:00:00'),
(1, 'delete_user', 'users', 3, '删除用户: 李四', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', '2026-07-16 14:00:00');