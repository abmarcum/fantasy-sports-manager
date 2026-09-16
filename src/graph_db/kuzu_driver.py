import os
import kuzu
from typing import List, Dict, Any, Optional
from config import settings
from src.graph_db.schema import KUZU_SCHEMA_STATEMENTS

class KuzuDriver:
    """Kùzu Embedded Graph Database Connection Manager & Execution Engine (Singleton pattern)."""

    _db_instance = None
    _conn_instance = None

    def __init__(self, db_path: Optional[str] = None):
        self.db_path = db_path or settings.KUZU_DB_PATH
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        
        if KuzuDriver._db_instance is None:
            try:
                KuzuDriver._db_instance = kuzu.Database(self.db_path)
            except Exception as e:
                try:
                    KuzuDriver._db_instance = kuzu.Database(self.db_path, read_only=True)
                except Exception:
                    raise e
            KuzuDriver._conn_instance = kuzu.Connection(KuzuDriver._db_instance)
            self.init_schema()
            
        self.db = KuzuDriver._db_instance
        self.conn = KuzuDriver._conn_instance

    def init_schema(self):
        """Initializes Kùzu node tables and relationship tables if not already present."""
        for stmt in KUZU_SCHEMA_STATEMENTS:
            try:
                self.conn.execute(stmt)
            except Exception as e:
                err_msg = str(e).lower()
                if "already exists" not in err_msg:
                    print(f"Kùzu Schema Init Info: {e}")

    def execute_query(self, query: str, parameters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Executes a Cypher query against Kùzu and returns list of dictionary records."""
        try:
            if parameters:
                result = self.conn.execute(query, parameters)
            else:
                result = self.conn.execute(query)
                
            records = []
            column_names = result.get_column_names()
            while result.has_next():
                row = result.get_next()
                record = {}
                for idx, col in enumerate(column_names):
                    record[col] = row[idx]
                records.append(record)
            return records
        except Exception as e:
            print(f"Kùzu Query Execution Error: {e}\nQuery: {query}")
            return []

    def execute_write(self, query: str, parameters: Optional[Dict[str, Any]] = None):
        """Executes a mutating Cypher write statement."""
        try:
            if parameters:
                self.conn.execute(query, parameters)
            else:
                self.conn.execute(query)
        except Exception as e:
            print(f"Kùzu Write Execution Error: {e}\nQuery: {query}\nParams: {parameters}")
            raise e
