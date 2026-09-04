"""Share authentication limits across serverless instances."""
from alembic import op
import sqlalchemy as sa

revision = '75e0a09cab41'
down_revision = '916fef3768ae'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table('rate_counter',
        sa.Column('key', sa.String(64), primary_key=True),
        sa.Column('count', sa.BigInteger(), nullable=False),
        sa.Column('expires_at', sa.Float(), nullable=False))
    op.create_index('ix_rate_counter_expires_at', 'rate_counter', ['expires_at'])

def downgrade():
    op.drop_index('ix_rate_counter_expires_at', table_name='rate_counter')
    op.drop_table('rate_counter')
