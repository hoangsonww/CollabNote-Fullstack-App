-- Migration for E2EE feature

-- 1. Modify notes table
ALTER TABLE notes
ADD COLUMN encryption_version SMALLINT,
ADD COLUMN ciphertext BYTEA,
ADD COLUMN nonce BYTEA,
ADD COLUMN aad TEXT,
ADD COLUMN content_hash TEXT;

-- 2. Create note_keys table
CREATE TABLE note_keys (
    note_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    wrapped_dk BYTEA,
    alg TEXT,
    PRIMARY KEY (note_id, user_id),
    CONSTRAINT fk_note FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Create user_keys table
CREATE TABLE user_keys (
    user_id BIGINT NOT NULL PRIMARY KEY,
    pub_key BYTEA,
    pub_key_version INT,
    CONSTRAINT fk_user_key FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Enable RLS
ALTER TABLE user_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_keys ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for user_keys
CREATE POLICY "Allow users to insert their own key" ON user_keys
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to view their own key" ON user_keys
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Allow users to update their own key" ON user_keys
FOR UPDATE USING (auth.uid() = user_id);

-- 6. RLS Policies for note_keys
CREATE POLICY "Allow users to insert their own note key" ON note_keys
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to view their own note keys" ON note_keys
FOR SELECT USING (auth.uid() = user_id);
