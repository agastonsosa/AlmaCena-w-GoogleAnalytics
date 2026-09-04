"""Fixed-window counters shared by serverless instances through PostgreSQL."""
import hashlib
import hmac
import time
from flask import current_app
from limits.storage import Storage
from sqlalchemy import case, delete, select, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.dialects.postgresql import insert as postgres_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from api.models import db, RateCounter


class KitchenRateStorage(Storage):
    STORAGE_SCHEME = ['almacena']

    @property
    def base_exceptions(self):
        return SQLAlchemyError

    def key(self, value):
        return hmac.new(current_app.config['SECRET_KEY'].encode(), value.encode(), hashlib.sha256).hexdigest()

    def incr(self, key, expiry, amount=1):
        table = RateCounter.__table__
        now = time.time()
        insert = postgres_insert if db.engine.dialect.name == 'postgresql' else sqlite_insert
        statement = insert(table).values(key=self.key(key), count=amount, expires_at=now + expiry)
        statement = statement.on_conflict_do_update(index_elements=[table.c.key], set_={
            'count': case((table.c.expires_at <= now, amount), else_=table.c.count + amount),
            'expires_at': case((table.c.expires_at <= now, now + expiry), else_=table.c.expires_at),
        }).returning(table.c.count)
        # Commit independently of the protected endpoint, including failed login.
        with db.engine.begin() as connection:
            return connection.execute(statement).scalar_one()

    def get(self, key):
        with db.engine.connect() as connection:
            return connection.execute(select(RateCounter.count).where(RateCounter.key == self.key(key), RateCounter.expires_at > time.time())).scalar_one_or_none() or 0

    def get_expiry(self, key):
        now = time.time()
        with db.engine.connect() as connection:
            expiry = connection.execute(select(RateCounter.expires_at).where(RateCounter.key == self.key(key))).scalar_one_or_none()
            return max(expiry or now, now)

    def check(self):
        with db.engine.connect() as connection:
            return connection.execute(text('SELECT 1')).scalar_one() == 1

    def reset(self):
        with db.engine.begin() as connection:
            return connection.execute(delete(RateCounter)).rowcount

    def clear(self, key):
        with db.engine.begin() as connection:
            connection.execute(delete(RateCounter).where(RateCounter.key == self.key(key)))
