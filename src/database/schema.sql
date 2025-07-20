-- เปิดใช้งานส่วนขยาย uuid-ossp สำหรับการสร้าง UUIDs
-- หากคุณยังไม่ได้ติดตั้งส่วนขยายนี้ใน PostgreSQL ของคุณ
-- คุณอาจต้องรันคำสั่งนี้หนึ่งครั้ง: CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ตาราง: users
-- เก็บข้อมูลสมาชิกทีมและ Team Leader
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), -- รหัสผู้ใช้, ใช้ UUID เพื่อความไม่ซ้ำกันและกระจายตัว
    email VARCHAR(255) UNIQUE NOT NULL,                  -- อีเมลของผู้ใช้, ต้องไม่ซ้ำกันและไม่เป็นค่าว่าง
    password_hash VARCHAR(255) NOT NULL,                 -- แฮชรหัสผ่าน (ใช้ bcrypt)
    first_name VARCHAR(100) NOT NULL,                    -- ชื่อจริง
    last_name VARCHAR(100) NOT NULL,                     -- นามสกุล
    position VARCHAR(100),                               -- ตำแหน่งในทีม
    bio TEXT,                                            -- ประวัติโดยย่อหรือคำอธิบายส่วนตัว
    profile_picture_url VARCHAR(255),                    -- URL รูปโปรไฟล์
    role VARCHAR(50) NOT NULL DEFAULT 'team_member',     -- บทบาทของผู้ใช้: 'team_member' หรือ 'team_leader'
    status VARCHAR(50) NOT NULL DEFAULT 'active',        -- สถานะบัญชี: 'active' หรือ 'suspended'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),   -- วันที่และเวลาที่สร้างบัญชี
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()    -- วันที่และเวลาที่อัปเดตข้อมูลล่าสุด
);

-- สร้าง Index สำหรับคอลัมน์ email เพื่อการค้นหาที่รวดเร็ว
CREATE INDEX idx_users_email ON users (email);

-- ตาราง: skills
-- เก็บรายการทักษะต่างๆ
CREATE TABLE skills (
    skill_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), -- รหัสทักษะ
    skill_name VARCHAR(100) UNIQUE NOT NULL               -- ชื่อทักษะ, ต้องไม่ซ้ำกัน
);

-- สร้าง Index สำหรับคอลัมน์ skill_name เพื่อการค้นหาที่รวดเร็ว
CREATE INDEX idx_skills_name ON skills (skill_name);

-- ตารางเชื่อมโยง: user_skills
-- แสดงความสัมพันธ์ Many-to-Many ระหว่าง users และ skills (สมาชิกมีได้หลายทักษะ)
CREATE TABLE user_skills (
    user_id UUID NOT NULL,                               -- รหัสผู้ใช้ (Foreign Key)
    skill_id UUID NOT NULL,                              -- รหัสทักษะ (Foreign Key)
    PRIMARY KEY (user_id, skill_id),                     -- Primary Key แบบ Composite
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE, -- ลบเมื่อผู้ใช้ถูกลบ
    FOREIGN KEY (skill_id) REFERENCES skills(skill_id) ON DELETE CASCADE -- ลบเมื่อทักษะถูกลบ
);

-- ตาราง: projects
-- เก็บข้อมูลโปรเจกต์ของทีม
CREATE TABLE projects (
    project_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), -- รหัสโปรเจกต์
    project_name VARCHAR(255) NOT NULL,                   -- ชื่อโปรเจกต์
    description TEXT,                                     -- คำอธิบายโปรเจกต์
    status VARCHAR(50) NOT NULL DEFAULT 'pending',        -- สถานะโปรเจกต์: 'pending', 'approved', 'rejected'
    created_by_user_id UUID NOT NULL,                     -- รหัสผู้ใช้ที่สร้างโปรเจกต์ (Foreign Key)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),    -- วันที่และเวลาที่สร้างโปรเจกต์
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),    -- วันที่และเวลาที่อัปเดตข้อมูลล่าสุด
    FOREIGN KEY (created_by_user_id) REFERENCES users(user_id) ON DELETE RESTRICT -- ไม่อนุญาตให้ลบผู้ใช้หากยังมีโปรเจกต์ที่สร้างอยู่
);

-- สร้าง Index สำหรับคอลัมน์ project_name เพื่อการค้นหาที่รวดเร็ว
CREATE INDEX idx_projects_name ON projects (project_name);
-- สร้าง Index สำหรับคอลัมน์ status เพื่อการกรองที่รวดเร็ว
CREATE INDEX idx_projects_status ON projects (status);

-- ตารางเชื่อมโยง: project_participants
-- แสดงความสัมพันธ์ Many-to-Many ระหว่าง projects และ users (สมาชิกที่ร่วมในโปรเจกต์)
CREATE TABLE project_participants (
    project_id UUID NOT NULL,                             -- รหัสโปรเจกต์ (Foreign Key)
    user_id UUID NOT NULL,                                -- รหัสผู้ใช้ (Foreign Key)
    PRIMARY KEY (project_id, user_id),                    -- Primary Key แบบ Composite
    FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE, -- ลบเมื่อโปรเจกต์ถูกลบ
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE          -- ลบเมื่อผู้ใช้ถูกลบ
);

-- ตารางเชื่อมโยง: project_skills
-- แสดงความสัมพันธ์ Many-to-Many ระหว่าง projects และ skills (ทักษะที่ใช้ในโปรเจกต์)
CREATE TABLE project_skills (
    project_id UUID NOT NULL,                             -- รหัสโปรเจกต์ (Foreign Key)
    skill_id UUID NOT NULL,                               -- รหัสทักษะ (Foreign Key)
    PRIMARY KEY (project_id, skill_id),                   -- Primary Key แบบ Composite
    FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE, -- ลบเมื่อโปรเจกต์ถูกลบ
    FOREIGN KEY (skill_id) REFERENCES skills(skill_id) ON DELETE CASCADE        -- ลบเมื่อทักษะถูกลบ
);

-- ตาราง: project_media
-- เก็บรูปภาพ, สื่อประกอบ และลิงก์สำหรับแต่ละโปรเจกต์
CREATE TABLE project_media (
    media_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), -- รหัสสื่อ
    project_id UUID NOT NULL,                             -- รหัสโปรเจกต์ที่สื่อนี้เป็นของ (Foreign Key)
    media_type VARCHAR(50) NOT NULL,                      -- ประเภทสื่อ: 'image', 'link', 'video'
    url VARCHAR(255) NOT NULL,                            -- URL ของสื่อ (เช่น URL รูปภาพ, ลิงก์ภายนอก)
    description TEXT,                                     -- คำอธิบายสำหรับสื่อนี้
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),    -- วันที่และเวลาที่เพิ่มสื่อ
    FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE -- ลบเมื่อโปรเจกต์ถูกลบ
);

-- สร้าง Index สำหรับคอลัมน์ project_id เพื่อการค้นหาที่รวดเร็ว
CREATE INDEX idx_project_media_project_id ON project_media (project_id);

-- ทริกเกอร์สำหรับอัปเดต updated_at ในตาราง users และ projects
-- ฟังก์ชันสำหรับอัปเดต updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ทริกเกอร์สำหรับตาราง users
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ทริกเกอร์สำหรับตาราง projects
CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON projects
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
