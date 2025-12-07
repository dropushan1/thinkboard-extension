import sqlite3

def update_db():
    db_path = "instance/notes.db"  # Check this path
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if columns exist
        cursor.execute("PRAGMA table_info(study_word)")
        columns = [info[1] for info in cursor.fetchall()]
        
        if 'meaning' not in columns:
            print("Adding 'meaning' column...")
            cursor.execute("ALTER TABLE study_word ADD COLUMN meaning TEXT")
            
        if 'example' not in columns:
            print("Adding 'example' column...")
            cursor.execute("ALTER TABLE study_word ADD COLUMN example TEXT")
            
        conn.commit()
        conn.close()
        print("Database update complete.")
        
    except Exception as e:
        print(f"Error updating database: {e}")

if __name__ == "__main__":
    update_db()
