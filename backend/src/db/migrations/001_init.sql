CREATE TYPE user_role AS ENUM ('ADMIN', 'USER', 'STORE_OWNER');

CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          varchar(60)  NOT NULL CHECK (char_length(name) BETWEEN 20 AND 60),
  email         varchar(255) NOT NULL,
  password_hash text         NOT NULL,
  address       varchar(400) NOT NULL,
  role          user_role    NOT NULL DEFAULT 'USER',
  created_at    timestamptz  NOT NULL DEFAULT now(),
  updated_at    timestamptz  NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX users_email_lower_uq ON users (lower(email));
CREATE INDEX users_role_idx ON users (role);

CREATE TABLE stores (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       varchar(60)  NOT NULL CHECK (char_length(name) BETWEEN 20 AND 60),
  email      varchar(255) NOT NULL,
  address    varchar(400) NOT NULL,
  owner_id   uuid UNIQUE REFERENCES users (id) ON DELETE SET NULL,
  created_at timestamptz  NOT NULL DEFAULT now(),
  updated_at timestamptz  NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX stores_email_lower_uq ON stores (lower(email));

CREATE TABLE ratings (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid     NOT NULL REFERENCES users (id)  ON DELETE CASCADE,
  store_id   uuid     NOT NULL REFERENCES stores (id) ON DELETE CASCADE,
  rating     smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ratings_user_store_uq UNIQUE (user_id, store_id)
);

CREATE INDEX ratings_store_idx ON ratings (store_id);
