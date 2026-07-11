"""
Database Router for dual database setup
Routes queries to local or cloud database
"""
from django.conf import settings


class DualDatabaseRouter:
    """
    A router to control database operations for dual database setup
    
    - Local operations use 'default' (SQLite)
    - Cloud sync operations use 'cloud' (PostgreSQL)
    - Read operations prioritize local database
    - Explicit using='cloud' operations are allowed
    """
    
    def db_for_read(self, model, **hints):
        """
        All read operations use local database for speed unless explicitly specified
        """
        # If explicitly requested, honor the request
        if 'using' in hints:
            return hints['using']
        return 'default'
    
    def db_for_write(self, model, **hints):
        """
        All write operations go to local database unless explicitly specified
        Cloud sync happens asynchronously via sync_manager
        """
        # If explicitly requested (e.g., using='cloud'), honor the request
        if 'using' in hints:
            return hints['using']
        return 'default'
    
    def allow_relation(self, obj1, obj2, **hints):
        """
        Allow relations only within same database
        """
        db_set = {'default', 'cloud'}
        if obj1._state.db in db_set and obj2._state.db in db_set:
            return True
        return None
    
    def allow_migrate(self, db, app_label, model_name=None, **hints):
        """
        Allow migrations on both databases to keep schemas in sync
        """
        return True
