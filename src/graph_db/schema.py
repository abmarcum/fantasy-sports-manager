"""
Graph Database Schema definitions for Kùzu and Neo4j.
"""

KUZU_SCHEMA_STATEMENTS = [
    # Node Tables
    """
    CREATE NODE TABLE League (
        league_key STRING,
        name STRING,
        season STRING,
        num_teams INT64,
        scoring_type STRING,
        PRIMARY KEY (league_key)
    );
    """,
    """
    CREATE NODE TABLE Team (
        team_key STRING,
        team_id STRING,
        name STRING,
        manager_name STRING,
        logo_url STRING,
        draft_position INT64,
        is_user_team BOOL,
        PRIMARY KEY (team_key)
    );
    """,
    """
    CREATE NODE TABLE Player (
        player_key STRING,
        player_id STRING,
        name STRING,
        position STRING,
        nfl_team STRING,
        headshot_url STRING,
        bye_week STRING,
        adp DOUBLE,
        status STRING,
        PRIMARY KEY (player_key)
    );
    """,
    """
    CREATE NODE TABLE NFLTeam (
        abbr STRING,
        name STRING,
        bye_week STRING,
        PRIMARY KEY (abbr)
    );
    """,
    """
    CREATE NODE TABLE StatCategory (
        stat_id STRING,
        display_name STRING,
        name STRING,
        PRIMARY KEY (stat_id)
    );
    """,

    # Relationship Tables
    """
    CREATE REL TABLE BELONGS_TO (
        FROM Team TO League
    );
    """,
    """
    CREATE REL TABLE PLAYS_FOR (
        FROM Player TO NFLTeam
    );
    """,
    """
    CREATE REL TABLE DRAFTED (
        FROM Team TO Player,
        pick_num INT64,
        round INT64,
        cost INT64
    );
    """,
    """
    CREATE REL TABLE ROSTERED (
        FROM Team TO Player,
        week INT64,
        selected_position STRING,
        is_starter BOOL
    );
    """,
    """
    CREATE REL TABLE PERFORMED (
        FROM Player TO StatCategory,
        week INT64,
        val STRING
    );
    """,
    """
    CREATE REL TABLE MATCHED_AGAINST (
        FROM Team TO Team,
        week INT64,
        team_score DOUBLE,
        opp_score DOUBLE,
        outcome STRING
    );
    """,
    """
    CREATE REL TABLE STACKED_WITH (
        FROM Player TO Player,
        correlation DOUBLE
    );
    """,
    """
    CREATE REL TABLE BYE_CONFLICT (
        FROM Player TO Player,
        week STRING
    );
    """
]

NEO4J_SCHEMA_STATEMENTS = [
    "CREATE CONSTRAINT IF NOT EXISTS FOR (l:League) REQUIRE l.league_key IS UNIQUE;",
    "CREATE CONSTRAINT IF NOT EXISTS FOR (t:Team) REQUIRE t.team_key IS UNIQUE;",
    "CREATE CONSTRAINT IF NOT EXISTS FOR (p:Player) REQUIRE p.player_key IS UNIQUE;",
    "CREATE CONSTRAINT IF NOT EXISTS FOR (n:NFLTeam) REQUIRE n.abbr IS UNIQUE;",
    "CREATE CONSTRAINT IF NOT EXISTS FOR (s:StatCategory) REQUIRE s.stat_id IS UNIQUE;"
]
