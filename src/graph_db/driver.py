from config import settings
from src.graph_db.kuzu_driver import KuzuDriver
from src.graph_db.neo4j_driver import Neo4jDriver

class UnifiedGraphDriver:
    """Unified Graph Database Driver Abstraction switching lazily between Kùzu and Neo4j."""

    def __init__(self):
        self._backend = None
        self.engine_type = settings.DB_ENGINE.lower()

    @property
    def backend(self):
        if self._backend is None:
            if self.engine_type == "neo4j":
                print(f"Initializing Graph Database: Neo4j ({settings.NEO4J_URI})")
                self._backend = Neo4jDriver()
            else:
                print(f"Initializing Graph Database: Kùzu ({settings.KUZU_DB_PATH})")
                self._backend = KuzuDriver()
        return self._backend

    def execute_query(self, query: str, parameters: dict = None):
        return self.backend.execute_query(query, parameters)

    def execute_write(self, query: str, parameters: dict = None):
        return self.backend.execute_write(query, parameters)

db_driver = UnifiedGraphDriver()
