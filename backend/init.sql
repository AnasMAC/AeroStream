CREATE TABLE videos (
    -- Using UUID for the ID is best practice for distributed systems and matches MinIO folder names
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    
    -- Path to the manifest file in MinIO (e.g., "videos/uuid/manifest.m3u8")
    manifest_path TEXT NOT NULL,
    
    -- Path to the thumbnail image in MinIO (e.g., "thumbnails/uuid.jpg")
    thumbnail_url TEXT,
    
    -- Meta-information
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexing title for faster search later
CREATE INDEX idx_videos_title ON videos(title);

INSERT INTO videos (title, category, manifest_path, thumbnail_url)
VALUES (
    'My First Stream', 
    'Engineering', 
    'test/manifest.m3u8', 
    'test/thumbnail.jpg'
);