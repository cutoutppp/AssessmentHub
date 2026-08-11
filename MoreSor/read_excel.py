import pandas as pd
import json

file_path = 'Moresorsytem.xlsx'
xls = pd.ExcelFile(file_path)

output = {}
for sheet_name in xls.sheet_names:
    df = pd.read_excel(xls, sheet_name=sheet_name, nrows=5)
    output[sheet_name] = {
        'columns': list(df.columns),
        'head': df.to_dict(orient='records')
    }

with open('excel_structure.json', 'w', encoding='utf-8') as f:
    json.dump(output, f, ensure_ascii=False, indent=2)
