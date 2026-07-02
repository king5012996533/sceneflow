INSERT INTO "User" (id, email, name, password, role, "createdAt", "updatedAt")
VALUES ('cm_admin_001', 'admin@xingtuai.cn', '管理员', '$2b$10$ktEoHjKUaYgSRCQhqxKSjOpSHiM5IxL08K7Oso1bEMTaQk7uYDoVW', 'admin', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;
