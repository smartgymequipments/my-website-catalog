import mysql.connector
import os

def run():
    print("Connecting to MySQL...")
    conn = mysql.connector.connect(
        host="localhost",
        user="root",
        password="",      
        database="specifications_db" 
    )
    cursor = conn.cursor()
    
    with open('specifications_schema.sql', 'r') as f:
        sql_file = f.read()
        
    # Split by semicolon to execute one statement at a time
    sql_commands = sql_file.split(';')
    
    print(f"Found {len(sql_commands)} commands. Executing...")
    for command in sql_commands:
        try:
            if command.strip():
                cursor.execute(command)
        except Exception as e:
            print(f"Skipped command due to error (might already exist): {e}")

    conn.commit()
    cursor.close()
    conn.close()
    print("Database seeded successfully.")

if __name__ == '__main__':
    run()
