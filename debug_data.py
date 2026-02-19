import json
import sys

try:
    with open('c:/Users/khama/Website catalogue/data.js', 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Strip variable declaration "const equipmentData = " and trailing ";"
    # Find the first brace
    start_index = content.find('{')
    # Find the last brace
    end_index = content.rfind('}')
    
    if start_index == -1 or end_index == -1:
        print("Could not find JSON object bounds")
        sys.exit(1)
        
    json_str = content[start_index:end_index+1]
    
    data = json.loads(json_str)
    
    abs_items = []
    for key, item in data.items():
        if item.get('subcategory') == 'Abs Machines':
            abs_items.append(item)
            
    print(f"Found {len(abs_items)} items in 'Abs Machines'")
    for item in abs_items:
        print(f"- Name: {item.get('name')}")
        print(f"  Key: {key}")
        print(f"  Images: {len(item.get('images', []))}")

except Exception as e:
    print(f"Error: {e}")
