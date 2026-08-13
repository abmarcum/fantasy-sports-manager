from typing import List, Dict, Any, Optional
from neo4j import GraphDatabase
from config import settings
from src.graph_db.schema import NEO4J_SCHEMA_STATEMENTS

class Neo4jDriver:
    """Neo4j Bolt Graph Database Driver Manager."""

    def __init__(self, uri: Optional[str] = None, user: Optional[str] = None, password: Optional[str] = None):
        self.uri = uri or settings.NEO4J_URI
        self.user = user or settings.NEO4J_USER
        self.password = password or settings.NEO4J_PASSWORD
        try:
            self.driver = GraphDatabase.driver(self.uri, auth=(self.user, self.password))
            self.init_schema()
        except Exception as e:
            print(f"Neo4j Connection Warning: Could not connect to {self.uri}: {e}")
            self.driver = None

    def init_schema(self):
        if not self.driver:
            return
        with self.driver.session() as session:
            for stmt in NEO4J_SCHEMA_STATEMENTS:
                try:
                    session.run(stmt)
                except Exception:
                    pass

    def execute_query(self, query: str, parameters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        if not self.driver:
            return []
        try:
            with self.driver.session() as session:
                result = session.run(query, parameters or {})
                return [record.data() for record in result]
        except Exception as e:
            print(f"Neo4j Query Error: {e}")
            return []

    def execute_write(self, query: str, parameters: Optional[Dict[str, Any]] = None):
        self.execute_query(query, parameters)

    def close(self):
        if self.driver:
            self.driver.close()
