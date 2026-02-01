import json
import os
import re

# Read data.js
with open('data.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Extract JSON part
json_str = content.replace('const equipmentData = ', '').strip().rstrip(';')

try:
    data = json.loads(json_str)
except json.JSONDecodeError as e:
    print(f"Error parsing data.js: {e}")
    exit(1)

# Create simplified dictionary for user to edit
descriptions = {}
for key, value in data.items():
    descriptions[key] = {
        "name": value.get('name', ''),
        "category": value.get('category', ''),
        "subcategory": value.get('subcategory', ''),
        "description": value.get('description', ''),
        "specs": value.get('specs', {})
    }

# Write to descriptions.json
with open('descriptions.json', 'w', encoding='utf-8') as f:
    json.dump(descriptions, f, indent=4)

print(f"Successfully created descriptions.json with {len(descriptions)} items.")
