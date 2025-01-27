CREATE TABLE IF NOT EXISTS users(
    id SERIAL PRIMARY KEY,
    email TEXT,
    pwd TEXT,
    google_id TEXT,
    username TEXT
);

CREATE TABLE IF NOT EXISTS secrets(
    id SERIAL PRIMARY KEY,
    secret TEXT,
    user_id INTEGER REFERENCES users(id)
);