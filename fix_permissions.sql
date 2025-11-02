-- 修复房间管理权限问题
-- 运行此脚本前请备份数据库

-- 1. 确保rooms表的RLS策略正确
-- 删除现有的rooms策略
DROP POLICY IF EXISTS "Users can view rooms" ON rooms;
DROP POLICY IF EXISTS "Users can create rooms" ON rooms;
DROP POLICY IF EXISTS "Users can update rooms" ON rooms;
DROP POLICY IF EXISTS "Users can delete rooms" ON rooms;
-- 删除本脚本曾创建过的rooms策略（保证可重复执行）
DROP POLICY IF EXISTS "Anyone can view rooms" ON rooms;
DROP POLICY IF EXISTS "Authenticated users can create rooms" ON rooms;
DROP POLICY IF EXISTS "Room owners can update rooms" ON rooms;
DROP POLICY IF EXISTS "Room owners can delete rooms" ON rooms;

-- 重新创建rooms表的RLS策略
-- 允许所有人查看房间
CREATE POLICY "Anyone can view rooms" ON rooms
FOR SELECT USING (true);

-- 允许认证用户创建房间
CREATE POLICY "Authenticated users can create rooms" ON rooms
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 允许房间所有者更新房间
CREATE POLICY "Room owners can update rooms" ON rooms
FOR UPDATE
USING (
  auth.uid() = owner_id OR 
  auth.uid() IN (
    SELECT user_id FROM room_players 
    WHERE room_id = rooms.id AND role = 'owner'
  )
)
WITH CHECK (true);

-- 允许房间所有者删除房间
CREATE POLICY "Room owners can delete rooms" ON rooms
FOR DELETE USING (
  auth.uid() = owner_id OR 
  auth.uid() IN (
    SELECT user_id FROM room_players 
    WHERE room_id = rooms.id AND role = 'owner'
  )
);

-- 2. 确保room_players表的RLS策略正确
-- 删除现有的room_players策略
DROP POLICY IF EXISTS "Users can view room players" ON room_players;
DROP POLICY IF EXISTS "Users can join rooms" ON room_players;
DROP POLICY IF EXISTS "Users can leave rooms" ON room_players;
DROP POLICY IF EXISTS "Users can update room players" ON room_players;
-- 删除本脚本曾创建过的room_players策略（保证可重复执行）
DROP POLICY IF EXISTS "Anyone can view room players" ON room_players;
DROP POLICY IF EXISTS "Authenticated users can join rooms" ON room_players;
DROP POLICY IF EXISTS "Users can update own room player info" ON room_players;

-- 重新创建room_players表的RLS策略
-- 允许所有人查看房间玩家
CREATE POLICY "Anyone can view room players" ON room_players
FOR SELECT USING (true);

-- 允许认证用户加入房间
CREATE POLICY "Authenticated users can join rooms" ON room_players
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 允许用户离开房间（只能删除自己的记录）
CREATE POLICY "Users can leave rooms" ON room_players
FOR DELETE USING (auth.uid() = user_id);

-- 允许用户更新自己的房间玩家信息
CREATE POLICY "Users can update own room player info" ON room_players
FOR UPDATE USING (auth.uid() = user_id);

-- 3. 确保profiles表的RLS策略正确
-- 删除现有的profiles策略
DROP POLICY IF EXISTS "Users can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
-- 删除本脚本曾创建过的profiles策略（保证可重复执行）
DROP POLICY IF EXISTS "Anyone can view profiles" ON profiles;

-- 重新创建profiles表的RLS策略
-- 允许所有人查看用户资料
CREATE POLICY "Anyone can view profiles" ON profiles
FOR SELECT USING (true);

-- 允许用户更新自己的资料
CREATE POLICY "Users can update own profile" ON profiles
FOR UPDATE USING (auth.uid() = id);

-- 允许用户创建自己的资料
CREATE POLICY "Users can insert own profile" ON profiles
FOR INSERT WITH CHECK (auth.uid() = id);

-- 4. 确保Storage的avatars bucket存在并配置正确（避免删除以免触发外键约束）
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152, -- 2MB 限制
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 同步更新bucket属性（如果已存在则覆盖为期望配置）
UPDATE storage.buckets
SET public = true,
    file_size_limit = 2097152,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
WHERE id = 'avatars';

-- 删除现有的Storage策略
DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;

-- 重新创建Storage策略
-- 允许用户上传自己的头像
CREATE POLICY "Users can upload their own avatars" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 允许用户更新自己的头像
CREATE POLICY "Users can update their own avatars" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 允许用户删除自己的头像
CREATE POLICY "Users can delete their own avatars" ON storage.objects
FOR DELETE USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 允许所有人查看头像（公开读取）
CREATE POLICY "Anyone can view avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

-- 5. 确保所有表都启用了RLS
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 6. 验证策略是否正确创建
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('rooms', 'room_players', 'profiles')
ORDER BY tablename, policyname;
