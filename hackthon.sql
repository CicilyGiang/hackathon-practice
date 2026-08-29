
-- ============================================================
-- 0. EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ============================================================
-- 1. DROP EXISTING TABLES
-- ============================================================

DROP TABLE IF EXISTS email_verification_tokens CASCADE;
DROP TABLE IF EXISTS password_reset_tokens CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS login_history CASCADE;
DROP TABLE IF EXISTS user_activity_log CASCADE;
DROP TABLE IF EXISTS recommendations CASCADE;
DROP TABLE IF EXISTS event_reviews CASCADE;
DROP TABLE IF EXISTS event_attendance CASCADE;
DROP TABLE IF EXISTS event_faculties CASCADE;
DROP TABLE IF EXISTS event_interests CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS clubs CASCADE;
DROP TABLE IF EXISTS locations CASCADE;
DROP TABLE IF EXISTS user_interests CASCADE;
DROP TABLE IF EXISTS interests CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS faculties CASCADE;


-- ============================================================
-- 2. FACULTIES
-- ============================================================

CREATE TABLE faculties (

    faculty_id BIGSERIAL PRIMARY KEY,

    faculty_name VARCHAR(150)
        UNIQUE
        NOT NULL,

    faculty_code VARCHAR(20)
        UNIQUE
        NOT NULL,

    created_at TIMESTAMPTZ
        NOT NULL
        DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- 3. USERS
-- ============================================================

CREATE TABLE users (

    user_id BIGSERIAL PRIMARY KEY,

    username VARCHAR(50)
        UNIQUE
        NOT NULL,

    email VARCHAR(255)
        UNIQUE
        NOT NULL,

    password_hash VARCHAR(255)
        NOT NULL,

    first_name VARCHAR(80),

    last_name VARCHAR(80),

    display_name VARCHAR(120),

    student_id VARCHAR(50)
        UNIQUE,

    faculty_id BIGINT,

    year_level SMALLINT
        CHECK (
            year_level IS NULL
            OR year_level BETWEEN 1 AND 10
        ),

    avatar_url TEXT,

    bio TEXT,

    is_verified BOOLEAN
        NOT NULL
        DEFAULT FALSE,

    is_active BOOLEAN
        NOT NULL
        DEFAULT TRUE,

    failed_login_attempts INTEGER
        NOT NULL
        DEFAULT 0
        CHECK (failed_login_attempts >= 0),

    locked_until TIMESTAMPTZ,

    last_login TIMESTAMPTZ,

    created_at TIMESTAMPTZ
        NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMPTZ
        NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_users_faculty
        FOREIGN KEY (faculty_id)
        REFERENCES faculties(faculty_id)
        ON DELETE SET NULL
);


-- ============================================================
-- 4. INTERESTS
-- ============================================================

CREATE TABLE interests (

    interest_id BIGSERIAL PRIMARY KEY,

    interest_name VARCHAR(100)
        UNIQUE
        NOT NULL,

    category VARCHAR(100),

    emoji VARCHAR(20),

    created_at TIMESTAMPTZ
        NOT NULL
        DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- 5. USER INTERESTS
-- ============================================================

CREATE TABLE user_interests (

    user_id BIGINT NOT NULL,

    interest_id BIGINT NOT NULL,

    preference_weight NUMERIC(4,3)
        NOT NULL
        DEFAULT 1.000
        CHECK (
            preference_weight >= 0
            AND preference_weight <= 1
        ),

    created_at TIMESTAMPTZ
        NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (
        user_id,
        interest_id
    ),

    CONSTRAINT fk_user_interests_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_user_interests_interest
        FOREIGN KEY (interest_id)
        REFERENCES interests(interest_id)
        ON DELETE CASCADE
);


-- ============================================================
-- 6. LOCATIONS
-- ============================================================

CREATE TABLE locations (

    location_id BIGSERIAL PRIMARY KEY,

    location_name VARCHAR(150)
        NOT NULL,

    building_name VARCHAR(150),

    campus_name VARCHAR(150),

    address TEXT,

    latitude NUMERIC(9,6)
        NOT NULL
        CHECK (
            latitude BETWEEN -90 AND 90
        ),

    longitude NUMERIC(9,6)
        NOT NULL
        CHECK (
            longitude BETWEEN -180 AND 180
        ),

    indoor BOOLEAN
        NOT NULL
        DEFAULT TRUE,

    accessibility_info TEXT,

    created_at TIMESTAMPTZ
        NOT NULL
        DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- 7. CLUBS
-- ============================================================

CREATE TABLE clubs (

    club_id BIGSERIAL PRIMARY KEY,

    club_name VARCHAR(150)
        UNIQUE
        NOT NULL,

    description TEXT,

    faculty_id BIGINT,

    contact_email VARCHAR(255),

    website_url TEXT,

    instagram_url TEXT,

    verified BOOLEAN
        NOT NULL
        DEFAULT FALSE,

    created_at TIMESTAMPTZ
        NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_clubs_faculty
        FOREIGN KEY (faculty_id)
        REFERENCES faculties(faculty_id)
        ON DELETE SET NULL
);


-- ============================================================
-- 8. EVENTS
-- ============================================================

CREATE TABLE events (

    event_id BIGSERIAL PRIMARY KEY,

    club_id BIGINT,

    location_id BIGINT,

    title VARCHAR(200)
        NOT NULL,

    description TEXT,

    start_time TIMESTAMPTZ
        NOT NULL,

    end_time TIMESTAMPTZ
        NOT NULL,

    price NUMERIC(10,2)
        NOT NULL
        DEFAULT 0.00
        CHECK (price >= 0),

    capacity INTEGER
        CHECK (
            capacity IS NULL
            OR capacity > 0
        ),

    beginner_friendly BOOLEAN
        NOT NULL
        DEFAULT TRUE,

    registration_required BOOLEAN
        NOT NULL
        DEFAULT FALSE,

    image_url TEXT,

    event_status VARCHAR(30)
        NOT NULL
        DEFAULT 'scheduled'
        CHECK (
            event_status IN (
                'draft',
                'scheduled',
                'cancelled',
                'completed'
            )
        ),

    created_at TIMESTAMPTZ
        NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMPTZ
        NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT check_event_time
        CHECK (
            end_time > start_time
        ),

    CONSTRAINT fk_events_club
        FOREIGN KEY (club_id)
        REFERENCES clubs(club_id)
        ON DELETE SET NULL,

    CONSTRAINT fk_events_location
        FOREIGN KEY (location_id)
        REFERENCES locations(location_id)
        ON DELETE SET NULL
);


-- ============================================================
-- 9. EVENT INTERESTS
-- ============================================================

CREATE TABLE event_interests (

    event_id BIGINT NOT NULL,

    interest_id BIGINT NOT NULL,

    relevance_weight NUMERIC(4,3)
        NOT NULL
        DEFAULT 1.000
        CHECK (
            relevance_weight >= 0
            AND relevance_weight <= 1
        ),

    PRIMARY KEY (
        event_id,
        interest_id
    ),

    CONSTRAINT fk_event_interests_event
        FOREIGN KEY (event_id)
        REFERENCES events(event_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_event_interests_interest
        FOREIGN KEY (interest_id)
        REFERENCES interests(interest_id)
        ON DELETE CASCADE
);


-- ============================================================
-- 10. EVENT FACULTIES
-- ============================================================

CREATE TABLE event_faculties (

    event_id BIGINT NOT NULL,

    faculty_id BIGINT NOT NULL,

    PRIMARY KEY (
        event_id,
        faculty_id
    ),

    CONSTRAINT fk_event_faculties_event
        FOREIGN KEY (event_id)
        REFERENCES events(event_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_event_faculties_faculty
        FOREIGN KEY (faculty_id)
        REFERENCES faculties(faculty_id)
        ON DELETE CASCADE
);


-- ============================================================
-- 11. EVENT ATTENDANCE
-- ============================================================

CREATE TABLE event_attendance (

    attendance_id BIGSERIAL PRIMARY KEY,

    user_id BIGINT NOT NULL,

    event_id BIGINT NOT NULL,

    attendance_status VARCHAR(30)
        NOT NULL
        CHECK (
            attendance_status IN (
                'interested',
                'going',
                'attended',
                'cancelled'
            )
        ),

    registered_at TIMESTAMPTZ
        NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMPTZ
        NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (
        user_id,
        event_id
    ),

    CONSTRAINT fk_event_attendance_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_event_attendance_event
        FOREIGN KEY (event_id)
        REFERENCES events(event_id)
        ON DELETE CASCADE
);


-- ============================================================
-- 12. EVENT REVIEWS
-- ============================================================

CREATE TABLE event_reviews (

    review_id BIGSERIAL PRIMARY KEY,

    user_id BIGINT NOT NULL,

    event_id BIGINT NOT NULL,

    rating SMALLINT
        NOT NULL
        CHECK (
            rating BETWEEN 1 AND 5
        ),

    comment TEXT,

    created_at TIMESTAMPTZ
        NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMPTZ
        NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (
        user_id,
        event_id
    ),

    CONSTRAINT fk_event_reviews_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_event_reviews_event
        FOREIGN KEY (event_id)
        REFERENCES events(event_id)
        ON DELETE CASCADE
);


-- ============================================================
-- 13. RECOMMENDATIONS
-- ============================================================

CREATE TABLE recommendations (

    recommendation_id BIGSERIAL PRIMARY KEY,

    user_id BIGINT NOT NULL,

    event_id BIGINT NOT NULL,

    recommendation_score NUMERIC(5,4)
        NOT NULL
        CHECK (
            recommendation_score >= 0
            AND recommendation_score <= 1
        ),

    recommendation_type VARCHAR(50)
        NOT NULL
        CHECK (
            recommendation_type IN (
                'interest_match',
                'cross_faculty',
                'serendipity',
                'social',
                'trending',
                'ai'
            )
        ),

    reason TEXT,

    model_name VARCHAR(100),

    created_at TIMESTAMPTZ
        NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (
        user_id,
        event_id
    ),

    CONSTRAINT fk_recommendations_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_recommendations_event
        FOREIGN KEY (event_id)
        REFERENCES events(event_id)
        ON DELETE CASCADE
);


-- ============================================================
-- 14. USER ACTIVITY LOG
-- ============================================================

CREATE TABLE user_activity_log (

    activity_id BIGSERIAL PRIMARY KEY,

    user_id BIGINT,

    event_id BIGINT,

    activity_type VARCHAR(50)
        NOT NULL
        CHECK (
            activity_type IN (
                'view',
                'click',
                'save',
                'unsave',
                'share',
                'search',
                'recommendation_click'
            )
        ),

    metadata JSONB
        NOT NULL
        DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ
        NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_user_activity_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_user_activity_event
        FOREIGN KEY (event_id)
        REFERENCES events(event_id)
        ON DELETE CASCADE
);


-- ============================================================
-- 15. LOGIN HISTORY
-- ============================================================

CREATE TABLE login_history (

    login_id BIGSERIAL PRIMARY KEY,

    user_id BIGINT,

    login_time TIMESTAMPTZ
        NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    ip_address INET,

    user_agent TEXT,

    login_status VARCHAR(20)
        NOT NULL
        CHECK (
            login_status IN (
                'success',
                'failed',
                'locked'
            )
        ),

    CONSTRAINT fk_login_history_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE SET NULL
);


-- ============================================================
-- 16. USER SESSIONS
-- ============================================================

CREATE TABLE user_sessions (

    session_id UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),

    user_id BIGINT NOT NULL,

    refresh_token_hash VARCHAR(64)
        UNIQUE
        NOT NULL,

    expires_at TIMESTAMPTZ
        NOT NULL,

    revoked BOOLEAN
        NOT NULL
        DEFAULT FALSE,

    ip_address INET,

    user_agent TEXT,

    created_at TIMESTAMPTZ
        NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_user_sessions_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);


-- ============================================================
-- 17. PASSWORD RESET TOKENS
-- ============================================================

CREATE TABLE password_reset_tokens (

    token_id UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),

    user_id BIGINT NOT NULL,

    token_hash VARCHAR(64)
        UNIQUE
        NOT NULL,

    expires_at TIMESTAMPTZ
        NOT NULL,

    used BOOLEAN
        NOT NULL
        DEFAULT FALSE,

    created_at TIMESTAMPTZ
        NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_password_reset_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);


-- ============================================================
-- 18. EMAIL VERIFICATION TOKENS
-- ============================================================

CREATE TABLE email_verification_tokens (

    verification_id UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),

    user_id BIGINT NOT NULL,

    token_hash VARCHAR(64)
        UNIQUE
        NOT NULL,

    expires_at TIMESTAMPTZ
        NOT NULL,

    used BOOLEAN
        NOT NULL
        DEFAULT FALSE,

    created_at TIMESTAMPTZ
        NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_email_verification_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);


-- ============================================================
-- 19. UPDATED_AT FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN

    NEW.updated_at = CURRENT_TIMESTAMP;

    RETURN NEW;

END;
$$;


-- ============================================================
-- 20. UPDATED_AT TRIGGERS
-- ============================================================

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


CREATE TRIGGER trg_events_updated_at
BEFORE UPDATE ON events
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


CREATE TRIGGER trg_event_attendance_updated_at
BEFORE UPDATE ON event_attendance
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


CREATE TRIGGER trg_event_reviews_updated_at
BEFORE UPDATE ON event_reviews
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


-- ============================================================
-- 21. PASSWORD HASH FUNCTION
-- bcrypt style using pgcrypto
-- ============================================================

CREATE OR REPLACE FUNCTION hash_password(
    p_password TEXT
)
RETURNS TEXT
LANGUAGE SQL
AS $$
    SELECT crypt(
        p_password,
        gen_salt('bf', 12)
    );
$$;


-- ============================================================
-- 22. PASSWORD VERIFY FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION verify_password(
    p_password TEXT,
    p_password_hash TEXT
)
RETURNS BOOLEAN
LANGUAGE SQL
AS $$
    SELECT
        crypt(
            p_password,
            p_password_hash
        ) = p_password_hash;
$$;


-- ============================================================
-- 23. TOKEN HASH FUNCTION
-- SHA-256
-- ============================================================

CREATE OR REPLACE FUNCTION hash_token(
    p_token TEXT
)
RETURNS VARCHAR(64)
LANGUAGE SQL
AS $$
    SELECT encode(
        digest(
            p_token,
            'sha256'
        ),
        'hex'
    );
$$;


-- ============================================================
-- INDEXES
-- Safe to run multiple times
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_users_email
ON users(email);

CREATE INDEX IF NOT EXISTS idx_users_username
ON users(username);

CREATE INDEX IF NOT EXISTS idx_users_faculty
ON users(faculty_id);

CREATE INDEX IF NOT EXISTS idx_user_interests_user
ON user_interests(user_id);

CREATE INDEX IF NOT EXISTS idx_user_interests_interest
ON user_interests(interest_id);

CREATE INDEX IF NOT EXISTS idx_locations_coordinates
ON locations(latitude, longitude);

CREATE INDEX IF NOT EXISTS idx_clubs_faculty
ON clubs(faculty_id);

CREATE INDEX IF NOT EXISTS idx_events_start_time
ON events(start_time);

CREATE INDEX IF NOT EXISTS idx_events_location
ON events(location_id);

CREATE INDEX IF NOT EXISTS idx_events_club
ON events(club_id);

CREATE INDEX IF NOT EXISTS idx_events_status
ON events(event_status);

CREATE INDEX IF NOT EXISTS idx_events_beginner
ON events(beginner_friendly);

CREATE INDEX IF NOT EXISTS idx_event_interests_event
ON event_interests(event_id);

CREATE INDEX IF NOT EXISTS idx_event_interests_interest
ON event_interests(interest_id);

CREATE INDEX IF NOT EXISTS idx_event_faculties_event
ON event_faculties(event_id);

CREATE INDEX IF NOT EXISTS idx_event_faculties_faculty
ON event_faculties(faculty_id);

CREATE INDEX IF NOT EXISTS idx_attendance_user
ON event_attendance(user_id);

CREATE INDEX IF NOT EXISTS idx_attendance_event
ON event_attendance(event_id);

CREATE INDEX IF NOT EXISTS idx_reviews_event
ON event_reviews(event_id);

CREATE INDEX IF NOT EXISTS idx_recommendations_user_score
ON recommendations(
    user_id,
    recommendation_score DESC
);

CREATE INDEX IF NOT EXISTS idx_activity_user
ON user_activity_log(user_id);

CREATE INDEX IF NOT EXISTS idx_activity_event
ON user_activity_log(event_id);

CREATE INDEX IF NOT EXISTS idx_activity_created_at
ON user_activity_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_login_history_user
ON login_history(user_id);

CREATE INDEX IF NOT EXISTS idx_login_history_time
ON login_history(login_time DESC);

CREATE INDEX IF NOT EXISTS idx_sessions_user
ON user_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_sessions_expires
ON user_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_password_reset_user
ON password_reset_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_email_verification_user
ON email_verification_tokens(user_id);
-- ============================================================
-- CAMPUS CONNECT
-- INTEGRITY CONSTRAINTS + TRIGGERS
-- Run AFTER all tables have been created
-- ============================================================


-- ============================================================
-- 1. USER INTEGRITY CONSTRAINTS
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_username_length'
    ) THEN
        ALTER TABLE users
        ADD CONSTRAINT chk_username_length
        CHECK (char_length(username) BETWEEN 3 AND 50);
    END IF;
END $$;


DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_email_basic_format'
    ) THEN
        ALTER TABLE users
        ADD CONSTRAINT chk_email_basic_format
        CHECK (
            email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
        );
    END IF;
END $$;


DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_user_failed_login_attempts'
    ) THEN
        ALTER TABLE users
        ADD CONSTRAINT chk_user_failed_login_attempts
        CHECK (failed_login_attempts >= 0);
    END IF;
END $$;


-- ============================================================
-- 2. NORMALISE USERNAME + EMAIL
--
-- Alice@Example.com -> alice@example.com
-- ============================================================

CREATE OR REPLACE FUNCTION normalize_user_data()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN

    NEW.email := lower(trim(NEW.email));
    NEW.username := lower(trim(NEW.username));

    IF NEW.first_name IS NOT NULL THEN
        NEW.first_name := trim(NEW.first_name);
    END IF;

    IF NEW.last_name IS NOT NULL THEN
        NEW.last_name := trim(NEW.last_name);
    END IF;

    RETURN NEW;

END;
$$;


DROP TRIGGER IF EXISTS trg_normalize_user_data
ON users;


CREATE TRIGGER trg_normalize_user_data
BEFORE INSERT OR UPDATE
ON users
FOR EACH ROW
EXECUTE FUNCTION normalize_user_data();


-- ============================================================
-- 3. PREVENT EMPTY USERNAME / EMAIL
-- ============================================================

CREATE OR REPLACE FUNCTION prevent_empty_user_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN

    IF trim(NEW.username) = '' THEN
        RAISE EXCEPTION 'Username cannot be empty';
    END IF;

    IF trim(NEW.email) = '' THEN
        RAISE EXCEPTION 'Email cannot be empty';
    END IF;

    RETURN NEW;

END;
$$;


DROP TRIGGER IF EXISTS trg_prevent_empty_user_fields
ON users;


CREATE TRIGGER trg_prevent_empty_user_fields
BEFORE INSERT OR UPDATE
ON users
FOR EACH ROW
EXECUTE FUNCTION prevent_empty_user_fields();


-- ============================================================
-- 4. PASSWORD HASH INTEGRITY
--
-- Prevent obvious plaintext passwords being manually inserted.
--
-- pgcrypto bcrypt hashes normally start with:
-- $2a$
-- $2b$
-- $2x$
-- $2y$
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_password_hash_format'
    ) THEN

        ALTER TABLE users
        ADD CONSTRAINT chk_password_hash_format
        CHECK (
            password_hash ~ '^\$2[abxy]\$'
        );

    END IF;
END $$;


-- ============================================================
-- 5. FACULTY INTEGRITY
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_faculty_name_not_empty'
    ) THEN

        ALTER TABLE faculties
        ADD CONSTRAINT chk_faculty_name_not_empty
        CHECK (trim(faculty_name) <> '');

    END IF;
END $$;


DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_faculty_code_not_empty'
    ) THEN

        ALTER TABLE faculties
        ADD CONSTRAINT chk_faculty_code_not_empty
        CHECK (trim(faculty_code) <> '');

    END IF;
END $$;


-- ============================================================
-- 6. INTEREST INTEGRITY
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_interest_name_not_empty'
    ) THEN

        ALTER TABLE interests
        ADD CONSTRAINT chk_interest_name_not_empty
        CHECK (trim(interest_name) <> '');

    END IF;
END $$;


-- ============================================================
-- 7. LOCATION INTEGRITY
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_location_name_not_empty'
    ) THEN

        ALTER TABLE locations
        ADD CONSTRAINT chk_location_name_not_empty
        CHECK (trim(location_name) <> '');

    END IF;
END $$;


-- ============================================================
-- 8. CLUB NAME INTEGRITY
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_club_name_not_empty'
    ) THEN

        ALTER TABLE clubs
        ADD CONSTRAINT chk_club_name_not_empty
        CHECK (trim(club_name) <> '');

    END IF;
END $$;


-- ============================================================
-- 9. CLUB EMAIL FORMAT
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_club_email_format'
    ) THEN

        ALTER TABLE clubs
        ADD CONSTRAINT chk_club_email_format
        CHECK (
            contact_email IS NULL
            OR contact_email ~*
            '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
        );

    END IF;
END $$;


-- ============================================================
-- 10. EVENT TITLE CANNOT BE EMPTY
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_event_title_not_empty'
    ) THEN

        ALTER TABLE events
        ADD CONSTRAINT chk_event_title_not_empty
        CHECK (trim(title) <> '');

    END IF;
END $$;


-- ============================================================
-- 11. EVENT TIME INTEGRITY
--
-- Already likely exists in your schema.
-- Added safely in case it does not.
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_event_valid_time'
    ) THEN

        ALTER TABLE events
        ADD CONSTRAINT chk_event_valid_time
        CHECK (end_time > start_time);

    END IF;
END $$;


-- ============================================================
-- 12. EVENT PRICE
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_event_price_nonnegative'
    ) THEN

        ALTER TABLE events
        ADD CONSTRAINT chk_event_price_nonnegative
        CHECK (price >= 0);

    END IF;
END $$;


-- ============================================================
-- 13. EVENT CAPACITY
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_event_capacity_positive'
    ) THEN

        ALTER TABLE events
        ADD CONSTRAINT chk_event_capacity_positive
        CHECK (
            capacity IS NULL
            OR capacity > 0
        );

    END IF;
END $$;


-- ============================================================
-- 14. EVENT STATUS
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_event_status'
    ) THEN

        ALTER TABLE events
        ADD CONSTRAINT chk_event_status
        CHECK (
            event_status IN (
                'draft',
                'scheduled',
                'cancelled',
                'completed'
            )
        );

    END IF;
END $$;


-- ============================================================
-- 15. EVENT STATUS TRANSITION TRIGGER
--
-- Allowed:
--
-- draft -> scheduled
-- draft -> cancelled
--
-- scheduled -> cancelled
-- scheduled -> completed
--
-- completed cannot go backwards
-- cancelled cannot go backwards
-- ============================================================

CREATE OR REPLACE FUNCTION validate_event_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN

    IF OLD.event_status = NEW.event_status THEN
        RETURN NEW;
    END IF;


    IF OLD.event_status = 'draft'
       AND NEW.event_status IN (
           'scheduled',
           'cancelled'
       )
    THEN
        RETURN NEW;
    END IF;


    IF OLD.event_status = 'scheduled'
       AND NEW.event_status IN (
           'cancelled',
           'completed'
       )
    THEN
        RETURN NEW;
    END IF;


    RAISE EXCEPTION
        'Invalid event status transition: % -> %',
        OLD.event_status,
        NEW.event_status;

END;
$$;


DROP TRIGGER IF EXISTS trg_validate_event_status_transition
ON events;


CREATE TRIGGER trg_validate_event_status_transition
BEFORE UPDATE OF event_status
ON events
FOR EACH ROW
EXECUTE FUNCTION validate_event_status_transition();


-- ============================================================
-- 16. PREVENT COMPLETED EVENT BEFORE END TIME
-- ============================================================

CREATE OR REPLACE FUNCTION validate_completed_event()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN

    IF NEW.event_status = 'completed'
       AND NEW.end_time > CURRENT_TIMESTAMP
    THEN

        RAISE EXCEPTION
            'Cannot mark event as completed before its end time';

    END IF;

    RETURN NEW;

END;
$$;


DROP TRIGGER IF EXISTS trg_validate_completed_event
ON events;


CREATE TRIGGER trg_validate_completed_event
BEFORE INSERT OR UPDATE
ON events
FOR EACH ROW
EXECUTE FUNCTION validate_completed_event();


-- ============================================================
-- 17. RSVP STATUS INTEGRITY
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_attendance_status'
    ) THEN

        ALTER TABLE event_attendance
        ADD CONSTRAINT chk_attendance_status
        CHECK (
            attendance_status IN (
                'interested',
                'going',
                'attended',
                'cancelled'
            )
        );

    END IF;
END $$;


-- ============================================================
-- 18. EVENT CAPACITY TRIGGER
--
-- Only "going" occupies capacity.
-- ============================================================

CREATE OR REPLACE FUNCTION enforce_event_capacity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE

    v_capacity INTEGER;
    v_current_going INTEGER;

BEGIN

    -- Only relevant when becoming "going"
    IF NEW.attendance_status <> 'going' THEN
        RETURN NEW;
    END IF;


    SELECT capacity
    INTO v_capacity
    FROM events
    WHERE event_id = NEW.event_id
    FOR UPDATE;


    -- NULL capacity = unlimited
    IF v_capacity IS NULL THEN
        RETURN NEW;
    END IF;


    SELECT COUNT(*)
    INTO v_current_going
    FROM event_attendance
    WHERE event_id = NEW.event_id
      AND attendance_status = 'going'
      AND (
          TG_OP = 'INSERT'
          OR attendance_id <> NEW.attendance_id
      );


    IF v_current_going >= v_capacity THEN

        RAISE EXCEPTION
            'Event % has reached capacity',
            NEW.event_id;

    END IF;


    RETURN NEW;

END;
$$;


DROP TRIGGER IF EXISTS trg_enforce_event_capacity
ON event_attendance;


CREATE TRIGGER trg_enforce_event_capacity
BEFORE INSERT OR UPDATE OF attendance_status
ON event_attendance
FOR EACH ROW
EXECUTE FUNCTION enforce_event_capacity();


-- ============================================================
-- 19. CANNOT RSVP TO CANCELLED / COMPLETED EVENT
-- ============================================================

CREATE OR REPLACE FUNCTION validate_event_rsvp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE

    v_status VARCHAR(30);

BEGIN

    SELECT event_status
    INTO v_status
    FROM events
    WHERE event_id = NEW.event_id;


    IF v_status IS NULL THEN

        RAISE EXCEPTION
            'Event does not exist';

    END IF;


    IF v_status = 'cancelled' THEN

        RAISE EXCEPTION
            'Cannot RSVP to a cancelled event';

    END IF;


    IF v_status = 'completed'
       AND NEW.attendance_status IN (
           'going',
           'interested'
       )
    THEN

        RAISE EXCEPTION
            'Cannot RSVP to a completed event';

    END IF;


    RETURN NEW;

END;
$$;


DROP TRIGGER IF EXISTS trg_validate_event_rsvp
ON event_attendance;


CREATE TRIGGER trg_validate_event_rsvp
BEFORE INSERT OR UPDATE
ON event_attendance
FOR EACH ROW
EXECUTE FUNCTION validate_event_rsvp();


-- ============================================================
-- 20. ATTENDED STATUS ONLY AFTER EVENT STARTED
-- ============================================================

CREATE OR REPLACE FUNCTION validate_attended_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE

    v_start_time TIMESTAMPTZ;

BEGIN

    IF NEW.attendance_status <> 'attended' THEN
        RETURN NEW;
    END IF;


    SELECT start_time
    INTO v_start_time
    FROM events
    WHERE event_id = NEW.event_id;


    IF CURRENT_TIMESTAMP < v_start_time THEN

        RAISE EXCEPTION
            'User cannot be marked as attended before event starts';

    END IF;


    RETURN NEW;

END;
$$;


DROP TRIGGER IF EXISTS trg_validate_attended_status
ON event_attendance;


CREATE TRIGGER trg_validate_attended_status
BEFORE INSERT OR UPDATE OF attendance_status
ON event_attendance
FOR EACH ROW
EXECUTE FUNCTION validate_attended_status();


-- ============================================================
-- 21. REVIEW RATING INTEGRITY
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_review_rating'
    ) THEN

        ALTER TABLE event_reviews
        ADD CONSTRAINT chk_review_rating
        CHECK (
            rating BETWEEN 1 AND 5
        );

    END IF;
END $$;


-- ============================================================
-- 22. ONLY ATTENDEES CAN REVIEW
-- ============================================================

CREATE OR REPLACE FUNCTION validate_event_review()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE

    v_attendance_status VARCHAR(30);

BEGIN

    SELECT attendance_status
    INTO v_attendance_status
    FROM event_attendance
    WHERE user_id = NEW.user_id
      AND event_id = NEW.event_id;


    IF v_attendance_status IS NULL THEN

        RAISE EXCEPTION
            'User must attend the event before reviewing it';

    END IF;


    IF v_attendance_status <> 'attended' THEN

        RAISE EXCEPTION
            'Only users marked as attended can review this event';

    END IF;


    RETURN NEW;

END;
$$;


DROP TRIGGER IF EXISTS trg_validate_event_review
ON event_reviews;


CREATE TRIGGER trg_validate_event_review
BEFORE INSERT OR UPDATE
ON event_reviews
FOR EACH ROW
EXECUTE FUNCTION validate_event_review();


-- ============================================================
-- 23. PREVENT REVIEWING FUTURE EVENTS
-- ============================================================

CREATE OR REPLACE FUNCTION prevent_future_event_review()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE

    v_end_time TIMESTAMPTZ;

BEGIN

    SELECT end_time
    INTO v_end_time
    FROM events
    WHERE event_id = NEW.event_id;


    IF CURRENT_TIMESTAMP < v_end_time THEN

        RAISE EXCEPTION
            'Cannot review an event before it has finished';

    END IF;


    RETURN NEW;

END;
$$;


DROP TRIGGER IF EXISTS trg_prevent_future_event_review
ON event_reviews;


CREATE TRIGGER trg_prevent_future_event_review
BEFORE INSERT OR UPDATE
ON event_reviews
FOR EACH ROW
EXECUTE FUNCTION prevent_future_event_review();


-- ============================================================
-- 24. RECOMMENDATION SCORE
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_recommendation_score'
    ) THEN

        ALTER TABLE recommendations
        ADD CONSTRAINT chk_recommendation_score
        CHECK (
            recommendation_score
            BETWEEN 0 AND 1
        );

    END IF;
END $$;


-- ============================================================
-- 25. USER INTEREST WEIGHT
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_user_interest_weight'
    ) THEN

        ALTER TABLE user_interests
        ADD CONSTRAINT chk_user_interest_weight
        CHECK (
            preference_weight
            BETWEEN 0 AND 1
        );

    END IF;
END $$;


-- ============================================================
-- 26. EVENT INTEREST WEIGHT
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_event_interest_weight'
    ) THEN

        ALTER TABLE event_interests
        ADD CONSTRAINT chk_event_interest_weight
        CHECK (
            relevance_weight
            BETWEEN 0 AND 1
        );

    END IF;
END $$;


-- ============================================================
-- 27. SESSION EXPIRY INTEGRITY
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_session_expiry'
    ) THEN

        ALTER TABLE user_sessions
        ADD CONSTRAINT chk_session_expiry
        CHECK (
            expires_at > created_at
        );

    END IF;
END $$;


-- ============================================================
-- 28. RESET TOKEN EXPIRY
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_reset_token_expiry'
    ) THEN

        ALTER TABLE password_reset_tokens
        ADD CONSTRAINT chk_reset_token_expiry
        CHECK (
            expires_at > created_at
        );

    END IF;
END $$;


-- ============================================================
-- 29. EMAIL VERIFICATION TOKEN EXPIRY
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_verification_token_expiry'
    ) THEN

        ALTER TABLE email_verification_tokens
        ADD CONSTRAINT chk_verification_token_expiry
        CHECK (
            expires_at > created_at
        );

    END IF;
END $$;


-- ============================================================
-- 30. TOKEN HASH FORMAT
--
-- SHA-256 hex string = exactly 64 characters
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_session_token_hash'
    ) THEN

        ALTER TABLE user_sessions
        ADD CONSTRAINT chk_session_token_hash
        CHECK (
            refresh_token_hash ~ '^[0-9a-fA-F]{64}$'
        );

    END IF;
END $$;


DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_reset_token_hash'
    ) THEN

        ALTER TABLE password_reset_tokens
        ADD CONSTRAINT chk_reset_token_hash
        CHECK (
            token_hash ~ '^[0-9a-fA-F]{64}$'
        );

    END IF;
END $$;


DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_verification_token_hash'
    ) THEN

        ALTER TABLE email_verification_tokens
        ADD CONSTRAINT chk_verification_token_hash
        CHECK (
            token_hash ~ '^[0-9a-fA-F]{64}$'
        );

    END IF;
END $$;


-- ============================================================
-- 31. AUTOMATIC UPDATED_AT FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN

    NEW.updated_at := CURRENT_TIMESTAMP;

    RETURN NEW;

END;
$$;


-- USERS

DROP TRIGGER IF EXISTS trg_users_updated_at
ON users;

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE
ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


-- EVENTS

DROP TRIGGER IF EXISTS trg_events_updated_at
ON events;

CREATE TRIGGER trg_events_updated_at
BEFORE UPDATE
ON events
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


-- ATTENDANCE

DROP TRIGGER IF EXISTS trg_attendance_updated_at
ON event_attendance;

CREATE TRIGGER trg_attendance_updated_at
BEFORE UPDATE
ON event_attendance
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


-- REVIEWS

DROP TRIGGER IF EXISTS trg_reviews_updated_at
ON event_reviews;

CREATE TRIGGER trg_reviews_updated_at
BEFORE UPDATE
ON event_reviews
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


-- ============================================================
-- 32. PREVENT INACTIVE USER FROM RSVP
-- ============================================================

CREATE OR REPLACE FUNCTION prevent_inactive_user_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE

    v_active BOOLEAN;

BEGIN

    SELECT is_active
    INTO v_active
    FROM users
    WHERE user_id = NEW.user_id;


    IF v_active IS FALSE THEN

        RAISE EXCEPTION
            'Inactive user cannot perform this action';

    END IF;


    RETURN NEW;

END;
$$;


DROP TRIGGER IF EXISTS trg_active_user_attendance
ON event_attendance;


CREATE TRIGGER trg_active_user_attendance
BEFORE INSERT OR UPDATE
ON event_attendance
FOR EACH ROW
EXECUTE FUNCTION prevent_inactive_user_activity();


DROP TRIGGER IF EXISTS trg_active_user_review
ON event_reviews;


CREATE TRIGGER trg_active_user_review
BEFORE INSERT OR UPDATE
ON event_reviews
FOR EACH ROW
EXECUTE FUNCTION prevent_inactive_user_activity();


-- ============================================================
-- 33. AUTOMATIC CANCELLED RSVP HANDLING
--
-- When an event is cancelled:
-- all going/interested users become cancelled.
-- ============================================================

CREATE OR REPLACE FUNCTION cancel_event_attendance()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN

    IF OLD.event_status <> 'cancelled'
       AND NEW.event_status = 'cancelled'
    THEN

        UPDATE event_attendance

        SET
            attendance_status = 'cancelled',
            updated_at = CURRENT_TIMESTAMP

        WHERE event_id = NEW.event_id
          AND attendance_status IN (
              'going',
              'interested'
          );

    END IF;


    RETURN NEW;

END;
$$;


DROP TRIGGER IF EXISTS trg_cancel_event_attendance
ON events;


CREATE TRIGGER trg_cancel_event_attendance
AFTER UPDATE OF event_status
ON events
FOR EACH ROW
EXECUTE FUNCTION cancel_event_attendance();


-- ============================================================
-- 34. PREVENT CAPACITY FROM BEING LOWER THAN EXISTING RSVP
-- ============================================================

CREATE OR REPLACE FUNCTION validate_capacity_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE

    v_current_going INTEGER;

BEGIN

    IF NEW.capacity IS NULL THEN
        RETURN NEW;
    END IF;


    SELECT COUNT(*)
    INTO v_current_going
    FROM event_attendance

    WHERE event_id = NEW.event_id
      AND attendance_status = 'going';


    IF NEW.capacity < v_current_going THEN

        RAISE EXCEPTION
            'Capacity cannot be lower than current number of attendees (%)',
            v_current_going;

    END IF;


    RETURN NEW;

END;
$$;


DROP TRIGGER IF EXISTS trg_validate_capacity_update
ON events;


CREATE TRIGGER trg_validate_capacity_update
BEFORE UPDATE OF capacity
ON events
FOR EACH ROW
EXECUTE FUNCTION validate_capacity_update();



-- ============================================================
-- 35. PUBLIC USER PROFILE VIEW
--
-- Does NOT expose:
-- email
-- password_hash
-- student_id
-- failed_login_attempts
-- locked_until
-- last_login
-- ============================================================

DROP VIEW IF EXISTS v_user_profiles CASCADE;

CREATE VIEW v_user_profiles AS
SELECT
    u.user_id,
    u.username,
    u.display_name,
    u.faculty_id,
    f.faculty_name,
    f.faculty_code,
    u.year_level,
    u.avatar_url,
    u.bio,
    u.created_at
FROM users u
LEFT JOIN faculties f
    ON u.faculty_id = f.faculty_id
WHERE u.is_active = TRUE;


-- ============================================================
-- 36. EVENT DETAILS VIEW
-- Used by Map / List / Calendar frontend
-- ============================================================

CREATE OR REPLACE VIEW v_event_details AS
SELECT
    e.event_id,
    e.title,
    e.description,

    e.start_time,
    e.end_time,

    e.price,

    CASE
        WHEN e.price = 0 THEN TRUE
        ELSE FALSE
    END AS is_free,

    e.capacity,
    e.beginner_friendly,
    e.registration_required,
    e.image_url,
    e.event_status,

    e.club_id,
    c.club_name,

    e.location_id,
    l.location_name,
    l.building_name,
    l.campus_name,
    l.address,
    l.latitude,
    l.longitude,
    l.indoor,

    (
        SELECT COUNT(*)
        FROM event_attendance ea
        WHERE ea.event_id = e.event_id
          AND ea.attendance_status = 'going'
    ) AS going_count,

    (
        SELECT COUNT(*)
        FROM event_attendance ea
        WHERE ea.event_id = e.event_id
          AND ea.attendance_status = 'interested'
    ) AS interested_count,

    (
        SELECT COUNT(*)
        FROM event_reviews er
        WHERE er.event_id = e.event_id
    ) AS review_count,

    (
        SELECT ROUND(AVG(er.rating)::NUMERIC, 2)
        FROM event_reviews er
        WHERE er.event_id = e.event_id
    ) AS average_rating,

    ARRAY(
        SELECT i.interest_name
        FROM event_interests ei
        JOIN interests i
            ON ei.interest_id = i.interest_id
        WHERE ei.event_id = e.event_id
        ORDER BY ei.relevance_weight DESC
    ) AS interests,

    ARRAY(
        SELECT f2.faculty_name
        FROM event_faculties ef
        JOIN faculties f2
            ON ef.faculty_id = f2.faculty_id
        WHERE ef.event_id = e.event_id
        ORDER BY f2.faculty_name
    ) AS faculties,

    e.created_at,
    e.updated_at

FROM events e

LEFT JOIN clubs c
    ON e.club_id = c.club_id

LEFT JOIN locations l
    ON e.location_id = l.location_id;


-- ============================================================
-- 37. UPCOMING EVENTS
-- ============================================================

CREATE OR REPLACE VIEW v_upcoming_events AS
SELECT *
FROM v_event_details
WHERE event_status = 'scheduled'
  AND end_time > CURRENT_TIMESTAMP;


-- ============================================================
-- 38. POPULAR EVENTS
-- ============================================================

CREATE OR REPLACE VIEW v_popular_events AS
SELECT
    event_id,
    title,
    club_name,
    location_name,
    start_time,
    end_time,
    price,
    beginner_friendly,
    going_count,
    interested_count,
    review_count,
    average_rating,

    (
        going_count * 3
        + interested_count
        + review_count * 2
    ) AS popularity_score

FROM v_event_details

WHERE event_status = 'scheduled'
  AND end_time > CURRENT_TIMESTAMP;


-- ============================================================
-- 39. AI EVENT CATALOG
-- ============================================================

CREATE OR REPLACE VIEW v_ai_event_catalog AS
SELECT
    event_id,
    title,
    description,

    start_time,
    end_time,

    price,
    is_free,

    beginner_friendly,

    club_name,

    location_name,
    campus_name,

    latitude,
    longitude,

    interests,
    faculties,

    going_count,
    interested_count,

    average_rating

FROM v_event_details

WHERE event_status = 'scheduled'
  AND end_time > CURRENT_TIMESTAMP;


-- ============================================================
-- 40. USER INTEREST PROFILE
-- ============================================================

CREATE OR REPLACE VIEW v_user_interest_profile AS
SELECT
    u.user_id,
    u.username,

    f.faculty_name,

    i.interest_id,
    i.interest_name,
    i.category,
    i.emoji,

    ui.preference_weight

FROM users u

LEFT JOIN faculties f
    ON u.faculty_id = f.faculty_id

JOIN user_interests ui
    ON u.user_id = ui.user_id

JOIN interests i
    ON ui.interest_id = i.interest_id;


-- ============================================================
-- 41. USER RECOMMENDATIONS
-- ============================================================

CREATE OR REPLACE VIEW v_user_recommendations AS
SELECT
    r.recommendation_id,

    r.user_id,
    u.username,

    r.event_id,
    e.title AS event_title,
    e.start_time,

    l.location_name,

    r.recommendation_score,
    r.recommendation_type,
    r.reason,
    r.model_name,

    r.created_at

FROM recommendations r

JOIN users u
    ON r.user_id = u.user_id

JOIN events e
    ON r.event_id = e.event_id

LEFT JOIN locations l
    ON e.location_id = l.location_id;


-- ============================================================
-- 42. FULL TEXT SEARCH
-- ============================================================

ALTER TABLE events
ADD COLUMN IF NOT EXISTS search_vector TSVECTOR
GENERATED ALWAYS AS (
    to_tsvector(
        'english',
        COALESCE(title, '')
        || ' '
        || COALESCE(description, '')
    )
) STORED;


-- ============================================================
-- 43. FULL TEXT SEARCH INDEX
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_events_search_vector
ON events
USING GIN(search_vector);


-- ============================================================
-- 44. SEARCH EVENTS FUNCTION
--
-- Example:
-- SELECT * FROM search_events('AI workshop', 20);
-- ============================================================

CREATE OR REPLACE FUNCTION search_events(
    p_query TEXT,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    result_event_id BIGINT,
    title VARCHAR(200),
    description TEXT,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    price NUMERIC(10,2),
    beginner_friendly BOOLEAN,
    club_name VARCHAR(150),
    location_name VARCHAR(150),
    latitude NUMERIC(9,6),
    longitude NUMERIC(9,6),
    search_rank REAL
)
LANGUAGE SQL
STABLE
AS $$
    SELECT
        e.event_id,
        e.title,
        e.description,
        e.start_time,
        e.end_time,
        e.price,
        e.beginner_friendly,

        c.club_name,

        l.location_name,
        l.latitude,
        l.longitude,

        ts_rank(
            e.search_vector,
            websearch_to_tsquery(
                'english',
                p_query
            )
        ) AS search_rank

    FROM events e

    LEFT JOIN clubs c
        ON e.club_id = c.club_id

    LEFT JOIN locations l
        ON e.location_id = l.location_id

    WHERE
        e.event_status = 'scheduled'

        AND e.end_time > CURRENT_TIMESTAMP

        AND e.search_vector @@
            websearch_to_tsquery(
                'english',
                p_query
            )

    ORDER BY search_rank DESC

    LIMIT LEAST(
        GREATEST(p_limit, 1),
        100
    );
$$;


-- ============================================================
-- 45. CURRENT APPLICATION USER
--
-- Backend later runs:
--
-- SET LOCAL app.user_id = '123';
--
-- Database functions then know who is logged in.
-- ============================================================

CREATE OR REPLACE FUNCTION get_current_app_user_id()
RETURNS BIGINT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_value TEXT;
BEGIN

    v_value :=
        current_setting(
            'app.user_id',
            TRUE
        );

    IF v_value IS NULL
       OR v_value = ''
    THEN
        RETURN NULL;
    END IF;

    BEGIN
        RETURN v_value::BIGINT;

    EXCEPTION
        WHEN invalid_text_representation THEN
            RETURN NULL;
    END;

END;
$$;


-- ============================================================
-- 46. REGISTER USER
--
-- Password is hashed BEFORE storage.
-- ============================================================

CREATE OR REPLACE FUNCTION register_user(
    p_username VARCHAR,
    p_email VARCHAR,
    p_password TEXT,
    p_first_name VARCHAR DEFAULT NULL,
    p_last_name VARCHAR DEFAULT NULL,
    p_faculty_id BIGINT DEFAULT NULL
)
RETURNS BIGINT

LANGUAGE plpgsql

SECURITY DEFINER

SET search_path = pg_catalog, public, pg_temp

AS $$
DECLARE
    v_user_id BIGINT;
BEGIN

    IF length(trim(p_username)) < 3 THEN
        RAISE EXCEPTION
            'Username must contain at least 3 characters';
    END IF;


    IF length(p_password) < 8 THEN
        RAISE EXCEPTION
            'Password must contain at least 8 characters';
    END IF;


    IF p_email !~*
       '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    THEN
        RAISE EXCEPTION
            'Invalid email address';
    END IF;


    INSERT INTO public.users (
        username,
        email,
        password_hash,
        first_name,
        last_name,
        display_name,
        faculty_id
    )
    VALUES (
        lower(trim(p_username)),
        lower(trim(p_email)),

        public.hash_password(p_password),

        p_first_name,
        p_last_name,

        COALESCE(
            NULLIF(trim(p_first_name), ''),
            lower(trim(p_username))
        ),

        p_faculty_id
    )

    RETURNING user_id
    INTO v_user_id;


    RETURN v_user_id;

END;
$$;


-- ============================================================
-- 47. AUTHENTICATE USER
-- ============================================================

CREATE OR REPLACE FUNCTION authenticate_user(
    p_email VARCHAR,
    p_password TEXT
)
RETURNS TABLE (
    authenticated BOOLEAN,
    authenticated_user_id BIGINT,
    authenticated_username VARCHAR,
    message TEXT
)

LANGUAGE plpgsql

SECURITY DEFINER

SET search_path = pg_catalog, public, pg_temp

AS $$
DECLARE
    v_user public.users%ROWTYPE;
BEGIN

    SELECT *
    INTO v_user
    FROM public.users
    WHERE email = lower(trim(p_email));


    -- Do not reveal whether account exists.

    IF NOT FOUND THEN

        RETURN QUERY
        SELECT
            FALSE,
            NULL::BIGINT,
            NULL::VARCHAR,
            'Invalid email or password'::TEXT;

        RETURN;

    END IF;


    IF NOT v_user.is_active THEN

        RETURN QUERY
        SELECT
            FALSE,
            NULL::BIGINT,
            NULL::VARCHAR,
            'Account unavailable'::TEXT;

        RETURN;

    END IF;


    IF v_user.locked_until IS NOT NULL
       AND v_user.locked_until > CURRENT_TIMESTAMP
    THEN

        INSERT INTO public.login_history (
            user_id,
            login_status
        )
        VALUES (
            v_user.user_id,
            'locked'
        );


        RETURN QUERY
        SELECT
            FALSE,
            NULL::BIGINT,
            NULL::VARCHAR,
            'Account temporarily locked'::TEXT;

        RETURN;

    END IF;


    IF public.verify_password(
        p_password,
        v_user.password_hash
    )
    THEN

        UPDATE public.users
        SET
            failed_login_attempts = 0,
            locked_until = NULL,
            last_login = CURRENT_TIMESTAMP
        WHERE user_id = v_user.user_id;


        INSERT INTO public.login_history (
            user_id,
            login_status
        )
        VALUES (
            v_user.user_id,
            'success'
        );


        RETURN QUERY
        SELECT
            TRUE,
            v_user.user_id,
            v_user.username,
            'Login successful'::TEXT;


    ELSE

        UPDATE public.users
        SET
            failed_login_attempts =
                failed_login_attempts + 1,

            locked_until =
                CASE
                    WHEN failed_login_attempts + 1 >= 5
                    THEN CURRENT_TIMESTAMP
                         + INTERVAL '15 minutes'
                    ELSE NULL
                END

        WHERE user_id = v_user.user_id;


        INSERT INTO public.login_history (
            user_id,
            login_status
        )
        VALUES (
            v_user.user_id,
            'failed'
        );


        RETURN QUERY
        SELECT
            FALSE,
            NULL::BIGINT,
            NULL::VARCHAR,
            'Invalid email or password'::TEXT;

    END IF;

END;
$$;


-- ============================================================
-- REMOVE OLD UNSAFE RSVP FUNCTION
-- ============================================================

DROP FUNCTION IF EXISTS
set_event_attendance(
    BIGINT,
    BIGINT,
    VARCHAR
);


-- ============================================================
-- 48. SAFE RSVP FUNCTION
--
-- IMPORTANT:
-- No p_user_id parameter.
--
-- Current user comes from:
-- app.user_id
--
-- Students cannot mark themselves "attended".
-- ============================================================

CREATE OR REPLACE FUNCTION set_event_attendance(
    p_event_id BIGINT,
    p_status VARCHAR
)
RETURNS BIGINT

LANGUAGE plpgsql

SECURITY DEFINER

SET search_path = pg_catalog, public, pg_temp

AS $$
DECLARE
    v_user_id BIGINT;
    v_attendance_id BIGINT;
BEGIN

    v_user_id :=
        public.get_current_app_user_id();


    IF v_user_id IS NULL THEN
        RAISE EXCEPTION
            'Application user is not authenticated';
    END IF;


    IF p_status NOT IN (
        'interested',
        'going',
        'cancelled'
    )
    THEN
        RAISE EXCEPTION
            'Invalid attendance status';
    END IF;


    INSERT INTO public.event_attendance (
        user_id,
        event_id,
        attendance_status
    )
    VALUES (
        v_user_id,
        p_event_id,
        p_status
    )

    ON CONFLICT (
        user_id,
        event_id
    )

    DO UPDATE

    SET
        attendance_status =
            EXCLUDED.attendance_status,

        updated_at =
            CURRENT_TIMESTAMP

    RETURNING attendance_id
    INTO v_attendance_id;


    RETURN v_attendance_id;

END;
$$;


-- ============================================================
-- REMOVE OLD UNSAFE REVIEW FUNCTION
-- ============================================================

DROP FUNCTION IF EXISTS
submit_event_review(
    BIGINT,
    BIGINT,
    SMALLINT,
    TEXT
);


-- ============================================================
-- 49. SAFE REVIEW FUNCTION
--
-- No p_user_id.
-- Uses authenticated app.user_id.
-- ============================================================

CREATE OR REPLACE FUNCTION submit_event_review(
    p_event_id BIGINT,
    p_rating SMALLINT,
    p_comment TEXT DEFAULT NULL
)
RETURNS BIGINT

LANGUAGE plpgsql

SECURITY DEFINER

SET search_path = pg_catalog, public, pg_temp

AS $$
DECLARE
    v_user_id BIGINT;
    v_review_id BIGINT;
BEGIN

    v_user_id :=
        public.get_current_app_user_id();


    IF v_user_id IS NULL THEN
        RAISE EXCEPTION
            'Application user is not authenticated';
    END IF;


    IF p_rating NOT BETWEEN 1 AND 5 THEN
        RAISE EXCEPTION
            'Rating must be between 1 and 5';
    END IF;


    INSERT INTO public.event_reviews (
        user_id,
        event_id,
        rating,
        comment
    )
    VALUES (
        v_user_id,
        p_event_id,
        p_rating,
        NULLIF(trim(p_comment), '')
    )

    ON CONFLICT (
        user_id,
        event_id
    )

    DO UPDATE

    SET
        rating = EXCLUDED.rating,
        comment = EXCLUDED.comment,
        updated_at = CURRENT_TIMESTAMP

    RETURNING review_id
    INTO v_review_id;


    RETURN v_review_id;

END;
$$;


-- ============================================================
-- 50. SET CURRENT USER INTEREST
-- ============================================================

CREATE OR REPLACE FUNCTION set_my_interest(
    p_interest_id BIGINT,
    p_weight NUMERIC DEFAULT 1.000
)
RETURNS VOID

LANGUAGE plpgsql

SECURITY DEFINER

SET search_path = pg_catalog, public, pg_temp

AS $$
DECLARE
    v_user_id BIGINT;
BEGIN

    v_user_id :=
        public.get_current_app_user_id();


    IF v_user_id IS NULL THEN
        RAISE EXCEPTION
            'Application user is not authenticated';
    END IF;


    IF p_weight < 0
       OR p_weight > 1
    THEN
        RAISE EXCEPTION
            'Interest weight must be between 0 and 1';
    END IF;


    INSERT INTO public.user_interests (
        user_id,
        interest_id,
        preference_weight
    )
    VALUES (
        v_user_id,
        p_interest_id,
        p_weight
    )

    ON CONFLICT (
        user_id,
        interest_id
    )

    DO UPDATE
    SET preference_weight =
        EXCLUDED.preference_weight;

END;
$$;


-- ============================================================
-- 51. REMOVE CURRENT USER INTEREST
-- ============================================================

CREATE OR REPLACE FUNCTION remove_my_interest(
    p_interest_id BIGINT
)
RETURNS VOID

LANGUAGE plpgsql

SECURITY DEFINER

SET search_path = pg_catalog, public, pg_temp

AS $$
DECLARE
    v_user_id BIGINT;
BEGIN

    v_user_id :=
        public.get_current_app_user_id();


    IF v_user_id IS NULL THEN
        RAISE EXCEPTION
            'Application user is not authenticated';
    END IF;


    DELETE FROM public.user_interests
    WHERE user_id = v_user_id
      AND interest_id = p_interest_id;

END;
$$;


-- ============================================================
-- 52. LOG USER ACTIVITY
--
-- User ID is automatically determined.
-- ============================================================

CREATE OR REPLACE FUNCTION log_user_activity(
    p_event_id BIGINT,
    p_activity_type VARCHAR,
    p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS BIGINT

LANGUAGE plpgsql

SECURITY DEFINER

SET search_path = pg_catalog, public, pg_temp

AS $$
DECLARE
    v_user_id BIGINT;
    v_activity_id BIGINT;
BEGIN

    v_user_id :=
        public.get_current_app_user_id();


    IF v_user_id IS NULL THEN
        RAISE EXCEPTION
            'Application user is not authenticated';
    END IF;


    IF p_activity_type NOT IN (
        'view',
        'click',
        'save',
        'unsave',
        'share',
        'search',
        'recommendation_click'
    )
    THEN
        RAISE EXCEPTION
            'Invalid activity type';
    END IF;


    INSERT INTO public.user_activity_log (
        user_id,
        event_id,
        activity_type,
        metadata
    )
    VALUES (
        v_user_id,
        p_event_id,
        p_activity_type,
        COALESCE(
            p_metadata,
            '{}'::JSONB
        )
    )

    RETURNING activity_id
    INTO v_activity_id;


    RETURN v_activity_id;

END;
$$;


-- ============================================================
-- 53. SAVE AI RECOMMENDATION
--
-- Intended for trusted backend/admin AI service.
-- ============================================================

CREATE OR REPLACE FUNCTION save_recommendation(
    p_user_id BIGINT,
    p_event_id BIGINT,
    p_score NUMERIC,
    p_type VARCHAR,
    p_reason TEXT,
    p_model_name VARCHAR DEFAULT NULL
)
RETURNS BIGINT

LANGUAGE plpgsql

SECURITY DEFINER

SET search_path = pg_catalog, public, pg_temp

AS $$
DECLARE
    v_recommendation_id BIGINT;
BEGIN

    IF p_score < 0
       OR p_score > 1
    THEN
        RAISE EXCEPTION
            'Recommendation score must be between 0 and 1';
    END IF;


    INSERT INTO public.recommendations (
        user_id,
        event_id,
        recommendation_score,
        recommendation_type,
        reason,
        model_name
    )
    VALUES (
        p_user_id,
        p_event_id,
        p_score,
        p_type,
        p_reason,
        p_model_name
    )

    ON CONFLICT (
        user_id,
        event_id
    )

    DO UPDATE

    SET
        recommendation_score =
            EXCLUDED.recommendation_score,

        recommendation_type =
            EXCLUDED.recommendation_type,

        reason =
            EXCLUDED.reason,

        model_name =
            EXCLUDED.model_name,

        created_at =
            CURRENT_TIMESTAMP

    RETURNING recommendation_id
    INTO v_recommendation_id;


    RETURN v_recommendation_id;

END;
$$;


-- ============================================================
-- 54. AUDIT LOG
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_log (

    audit_id BIGSERIAL PRIMARY KEY,

    table_name VARCHAR(100)
        NOT NULL,

    record_id TEXT,

    action VARCHAR(10)
        NOT NULL
        CHECK (
            action IN (
                'INSERT',
                'UPDATE',
                'DELETE'
            )
        ),

    old_data JSONB,

    new_data JSONB,

    database_user TEXT
        NOT NULL
        DEFAULT CURRENT_USER,

    app_user_id BIGINT,

    changed_at TIMESTAMPTZ
        NOT NULL
        DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- 55. AUDIT INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_audit_table_record
ON audit_log(
    table_name,
    record_id
);


CREATE INDEX IF NOT EXISTS idx_audit_changed_at
ON audit_log(
    changed_at DESC
);


CREATE INDEX IF NOT EXISTS idx_audit_app_user
ON audit_log(
    app_user_id
);


-- ============================================================
-- 56. GENERIC AUDIT FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION audit_row_change()
RETURNS TRIGGER

LANGUAGE plpgsql

AS $$
DECLARE
    v_old JSONB;
    v_new JSONB;
    v_record_id TEXT;
BEGIN

    IF TG_OP = 'INSERT' THEN

        v_old := NULL;

        v_new := to_jsonb(NEW);

        v_record_id :=
            v_new ->> TG_ARGV[0];


    ELSIF TG_OP = 'UPDATE' THEN

        v_old := to_jsonb(OLD);

        v_new := to_jsonb(NEW);

        v_record_id :=
            COALESCE(
                v_new ->> TG_ARGV[0],
                v_old ->> TG_ARGV[0]
            );


    ELSE

        v_old := to_jsonb(OLD);

        v_new := NULL;

        v_record_id :=
            v_old ->> TG_ARGV[0];

    END IF;


    -- Never audit password hashes.

    IF TG_TABLE_NAME = 'users' THEN

        IF v_old IS NOT NULL THEN
            v_old :=
                v_old - 'password_hash';
        END IF;


        IF v_new IS NOT NULL THEN
            v_new :=
                v_new - 'password_hash';
        END IF;

    END IF;


    INSERT INTO audit_log (
        table_name,
        record_id,
        action,
        old_data,
        new_data,
        database_user,
        app_user_id
    )
    VALUES (
        TG_TABLE_NAME,
        v_record_id,
        TG_OP,
        v_old,
        v_new,
        CURRENT_USER,
        get_current_app_user_id()
    );


    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;

END;
$$;


-- ============================================================
-- 57. AUDIT TRIGGERS
-- ============================================================


DROP TRIGGER IF EXISTS trg_audit_users
ON users;

CREATE TRIGGER trg_audit_users
AFTER INSERT OR UPDATE OR DELETE
ON users
FOR EACH ROW
EXECUTE FUNCTION audit_row_change('user_id');


DROP TRIGGER IF EXISTS trg_audit_clubs
ON clubs;

CREATE TRIGGER trg_audit_clubs
AFTER INSERT OR UPDATE OR DELETE
ON clubs
FOR EACH ROW
EXECUTE FUNCTION audit_row_change('club_id');


DROP TRIGGER IF EXISTS trg_audit_events
ON events;

CREATE TRIGGER trg_audit_events
AFTER INSERT OR UPDATE OR DELETE
ON events
FOR EACH ROW
EXECUTE FUNCTION audit_row_change('event_id');


DROP TRIGGER IF EXISTS trg_audit_attendance
ON event_attendance;

CREATE TRIGGER trg_audit_attendance
AFTER INSERT OR UPDATE OR DELETE
ON event_attendance
FOR EACH ROW
EXECUTE FUNCTION audit_row_change('attendance_id');


DROP TRIGGER IF EXISTS trg_audit_reviews
ON event_reviews;

CREATE TRIGGER trg_audit_reviews
AFTER INSERT OR UPDATE OR DELETE
ON event_reviews
FOR EACH ROW
EXECUTE FUNCTION audit_row_change('review_id');


DROP TRIGGER IF EXISTS trg_audit_recommendations
ON recommendations;

CREATE TRIGGER trg_audit_recommendations
AFTER INSERT OR UPDATE OR DELETE
ON recommendations
FOR EACH ROW
EXECUTE FUNCTION audit_row_change('recommendation_id');


DROP TRIGGER IF EXISTS trg_audit_user_interests
ON user_interests;

CREATE TRIGGER trg_audit_user_interests
AFTER INSERT OR UPDATE OR DELETE
ON user_interests
FOR EACH ROW
EXECUTE FUNCTION audit_row_change('user_id');



-- ============================================================
-- 58. DATABASE ROLES
--
-- These are DATABASE roles,
-- not frontend student/admin roles.
-- ============================================================

DO $$
BEGIN

    IF NOT EXISTS (
        SELECT 1
        FROM pg_roles
        WHERE rolname = 'campus_read_role'
    )
    THEN

        CREATE ROLE campus_read_role
        NOLOGIN;

    END IF;

END $$;


DO $$
BEGIN

    IF NOT EXISTS (
        SELECT 1
        FROM pg_roles
        WHERE rolname = 'campus_app_role'
    )
    THEN

        CREATE ROLE campus_app_role
        NOLOGIN;

    END IF;

END $$;


DO $$
BEGIN

    IF NOT EXISTS (
        SELECT 1
        FROM pg_roles
        WHERE rolname = 'campus_admin_role'
    )
    THEN

        CREATE ROLE campus_admin_role
        NOLOGIN;

    END IF;

END $$;


-- ============================================================
-- 59. PREVENT RANDOM DATABASE USERS
-- FROM CREATING OBJECTS IN PUBLIC SCHEMA
-- ============================================================

REVOKE CREATE
ON SCHEMA public
FROM PUBLIC;


-- ============================================================
-- 60. READ ROLE
-- ============================================================

GRANT USAGE
ON SCHEMA public
TO campus_read_role;


GRANT SELECT
ON
    faculties,
    interests,
    locations,
    clubs
TO campus_read_role;


GRANT SELECT
ON
    v_user_profiles,
    v_event_details,
    v_upcoming_events,
    v_popular_events,
    v_ai_event_catalog
TO campus_read_role;


GRANT EXECUTE
ON FUNCTION search_events(
    TEXT,
    INTEGER
)
TO campus_read_role;


-- ============================================================
-- 61. APPLICATION ROLE
-- ============================================================

GRANT campus_read_role
TO campus_app_role;


GRANT USAGE
ON SCHEMA public
TO campus_app_role;


-- ------------------------------------------------------------
-- IMPORTANT:
-- Remove direct write access from important tables.
-- ------------------------------------------------------------

REVOKE INSERT, UPDATE, DELETE
ON event_attendance
FROM campus_app_role;


REVOKE INSERT, UPDATE, DELETE
ON event_reviews
FROM campus_app_role;


REVOKE INSERT, UPDATE, DELETE
ON user_interests
FROM campus_app_role;


REVOKE INSERT, UPDATE, DELETE
ON recommendations
FROM campus_app_role;


REVOKE ALL
ON user_sessions
FROM campus_app_role;


REVOKE ALL
ON password_reset_tokens
FROM campus_app_role;


REVOKE ALL
ON email_verification_tokens
FROM campus_app_role;


-- ============================================================
-- APP ROLE VIEW ACCESS
-- ============================================================

GRANT SELECT
ON
    v_user_recommendations,
    v_user_interest_profile
TO campus_app_role;


-- ============================================================
-- 62. REMOVE PUBLIC EXECUTION
-- ============================================================

REVOKE ALL
ON FUNCTION register_user(
    VARCHAR,
    VARCHAR,
    TEXT,
    VARCHAR,
    VARCHAR,
    BIGINT
)
FROM PUBLIC;


REVOKE ALL
ON FUNCTION authenticate_user(
    VARCHAR,
    TEXT
)
FROM PUBLIC;


REVOKE ALL
ON FUNCTION set_event_attendance(
    BIGINT,
    VARCHAR
)
FROM PUBLIC;


REVOKE ALL
ON FUNCTION submit_event_review(
    BIGINT,
    SMALLINT,
    TEXT
)
FROM PUBLIC;


REVOKE ALL
ON FUNCTION set_my_interest(
    BIGINT,
    NUMERIC
)
FROM PUBLIC;


REVOKE ALL
ON FUNCTION remove_my_interest(
    BIGINT
)
FROM PUBLIC;


REVOKE ALL
ON FUNCTION log_user_activity(
    BIGINT,
    VARCHAR,
    JSONB
)
FROM PUBLIC;


REVOKE ALL
ON FUNCTION save_recommendation(
    BIGINT,
    BIGINT,
    NUMERIC,
    VARCHAR,
    TEXT,
    VARCHAR
)
FROM PUBLIC;


-- ============================================================
-- 63. APP ROLE FUNCTION PERMISSIONS
-- ============================================================

GRANT EXECUTE
ON FUNCTION register_user(
    VARCHAR,
    VARCHAR,
    TEXT,
    VARCHAR,
    VARCHAR,
    BIGINT
)
TO campus_app_role;


GRANT EXECUTE
ON FUNCTION authenticate_user(
    VARCHAR,
    TEXT
)
TO campus_app_role;


GRANT EXECUTE
ON FUNCTION set_event_attendance(
    BIGINT,
    VARCHAR
)
TO campus_app_role;


GRANT EXECUTE
ON FUNCTION submit_event_review(
    BIGINT,
    SMALLINT,
    TEXT
)
TO campus_app_role;


GRANT EXECUTE
ON FUNCTION set_my_interest(
    BIGINT,
    NUMERIC
)
TO campus_app_role;


GRANT EXECUTE
ON FUNCTION remove_my_interest(
    BIGINT
)
TO campus_app_role;


GRANT EXECUTE
ON FUNCTION log_user_activity(
    BIGINT,
    VARCHAR,
    JSONB
)
TO campus_app_role;


GRANT EXECUTE
ON FUNCTION search_events(
    TEXT,
    INTEGER
)
TO campus_app_role;


-- ============================================================
-- 64. ADMIN ROLE
-- ============================================================

GRANT USAGE
ON SCHEMA public
TO campus_admin_role;


GRANT SELECT, INSERT, UPDATE, DELETE
ON ALL TABLES
IN SCHEMA public
TO campus_admin_role;


GRANT USAGE, SELECT
ON ALL SEQUENCES
IN SCHEMA public
TO campus_admin_role;


GRANT EXECUTE
ON ALL FUNCTIONS
IN SCHEMA public
TO campus_admin_role;


GRANT EXECUTE
ON FUNCTION save_recommendation(
    BIGINT,
    BIGINT,
    NUMERIC,
    VARCHAR,
    TEXT,
    VARCHAR
)
TO campus_admin_role;


