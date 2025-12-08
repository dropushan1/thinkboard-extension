import sqlite3
import shutil
import os

def copy_structure_and_data(old_db, new_template, output_db, clear_custom_prompt=False):

    # 1. Copy the template new-format DB
    shutil.copy(new_template, output_db)

    conn_new = sqlite3.connect(output_db)
    cur_new = conn_new.cursor()

    conn_old = sqlite3.connect(old_db)
    cur_old = conn_old.cursor()

    # 2. Get all tables in the new template DB
    cur_new.execute("SELECT name FROM sqlite_master WHERE type='table'")
    new_tables = [row[0] for row in cur_new.fetchall()]

    # 3. Clear all tables except custom_prompt (optional)
    for table in new_tables:
        if table == "custom_prompt" and not clear_custom_prompt:
            continue
        cur_new.execute(f"DELETE FROM {table}")

    conn_new.commit()

    # 4. Insert old DB data into matching tables
    for table in new_tables:
        if table == "custom_prompt":  # do not copy old custom prompt data
            continue

        # Check if table exists in old DB
        cur_old.execute("SELECT name FROM sqlite_master WHERE type='table'")
        old_tables = [row[0] for row in cur_old.fetchall()]

        if table not in old_tables:
            continue

        # Get column names
        cur_old.execute(f"PRAGMA table_info({table})")
        old_cols = [col[1] for col in cur_old.fetchall()]
        col_str = ",".join(old_cols)

        # Fetch all rows from old DB table
        cur_old.execute(f"SELECT {col_str} FROM {table}")
        rows = cur_old.fetchall()

        # Insert into new DB
        for row in rows:
            placeholders = ",".join(["?"] * len(row))
            cur_new.execute(f"INSERT INTO {table} ({col_str}) VALUES ({placeholders})", row)

    conn_new.commit()
    conn_new.close()
    conn_old.close()

    print(f"\n✔ Migration complete! Output saved to:\n{output_db}\n")


# ---------------------------
# Interactive terminal mode
# ---------------------------
if __name__ == "__main__":
    print("\n=== SQLite DB Migration Tool ===\n")

    old_db = input("Enter path to OLD database file: ").strip()
    new_template = input("Enter path to NEW template database file: ").strip()
    output_db = input("Enter output database filename (e.g., merged.db): ").strip()

    # Expand ~ for Mac paths
    old_db = os.path.expanduser(old_db)
    new_template = os.path.expanduser(new_template)
    output_db = os.path.expanduser(output_db)

    # Run migration
    copy_structure_and_data(old_db, new_template, output_db)
