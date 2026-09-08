
import json
import os
import sys

# Ensure we can import from the current directory
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import p1
import p2
import p3

output_path = r"E:\OxfordTree\oxford-tree-pwa\docs\dictionary\dictionary.json"

all_entries = []
all_entries.extend(p1.data)
all_entries.extend(p2.data)
all_entries.extend(p3.data)

# Remove duplicates if any (by key)
seen = set()
final_entries = []
for entry in all_entries:
    if entry["key"] not in seen:
        final_entries.append(entry)
        seen.add(entry["key"])

data = {"entries": final_entries}

with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print(f"Successfully saved {len(final_entries)} entries to {output_path}")
