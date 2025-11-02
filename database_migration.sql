-- 数据库迁移脚本：为现有房间添加short_id字段
-- 运行此脚本前请备份数据库

-- 1. 添加short_id字段（如果不存在）
ALTER TABLE public.rooms 
ADD COLUMN IF NOT EXISTS short_id text;

-- 2. 添加唯一约束
ALTER TABLE public.rooms 
ADD CONSTRAINT IF NOT EXISTS rooms_short_id_unique UNIQUE (short_id);

-- 3. 添加索引
CREATE INDEX IF NOT EXISTS idx_rooms_short_id ON public.rooms(short_id);

-- 4. 为现有房间生成short_id
-- 注意：这个函数需要PostgreSQL 9.5+支持
DO $$
DECLARE
    room_record RECORD;
    new_short_id TEXT;
    attempts INTEGER;
BEGIN
    -- 为所有没有short_id的房间生成6位数字ID
    FOR room_record IN 
        SELECT id FROM public.rooms WHERE short_id IS NULL
    LOOP
        attempts := 0;
        LOOP
            -- 生成6位随机数字
            new_short_id := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
            
            -- 检查是否已存在
            IF NOT EXISTS (SELECT 1 FROM public.rooms WHERE short_id = new_short_id) THEN
                -- 更新房间记录
                UPDATE public.rooms 
                SET short_id = new_short_id 
                WHERE id = room_record.id;
                EXIT; -- 跳出内层循环
            END IF;
            
            attempts := attempts + 1;
            IF attempts > 100 THEN
                RAISE EXCEPTION '无法为房间 % 生成唯一的short_id', room_record.id;
            END IF;
        END LOOP;
    END LOOP;
END $$;

-- 5. 验证迁移结果
SELECT 
    COUNT(*) as total_rooms,
    COUNT(short_id) as rooms_with_short_id,
    COUNT(*) - COUNT(short_id) as rooms_without_short_id
FROM public.rooms;

-- 6. 显示一些示例数据
SELECT id, short_id, name, status, created_at 
FROM public.rooms 
ORDER BY created_at DESC 
LIMIT 10;
