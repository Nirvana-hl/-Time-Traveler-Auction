-- 用户资料表迁移脚本
-- 运行此脚本前请备份数据库

-- 1. 添加avatar字段（如果不存在）
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar text;

-- 2. 添加updated_at字段（如果不存在）
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 3. 为现有用户创建默认资料记录
INSERT INTO public.profiles (id, username, avatar, created_at, updated_at)
SELECT 
    au.id,
    COALESCE(au.email, '用户' || substring(au.id::text, 1, 8)) as username,
    NULL as avatar,
    au.created_at,
    now() as updated_at
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- 4. 验证迁移结果
SELECT 
    COUNT(*) as total_users,
    COUNT(p.id) as users_with_profiles,
    COUNT(*) - COUNT(p.id) as users_without_profiles
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id;

-- 5. 显示一些示例数据
SELECT 
    p.id,
    p.username,
    p.avatar,
    p.created_at,
    p.updated_at
FROM public.profiles p
ORDER BY p.created_at DESC
LIMIT 10;
