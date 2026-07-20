import os
import zipfile

source_dir = r'C:\Users\peera\Desktop\AntigravityProject\AssessmentHub\SgsNextschool'
zip_filename = r'C:\Users\peera\Desktop\SgsNextschool_Backup_v1.2.4.zip'

exclude_dirs = {'node_modules', '.venv', 'venv', '__pycache__', 'dist', '.git'}

with zipfile.ZipFile(zip_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk(source_dir):
        # Exclude directories
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        
        for file in files:
            file_path = os.path.join(root, file)
            # Add file to zip relative to the source directory
            arcname = os.path.relpath(file_path, start=os.path.dirname(source_dir))
            zipf.write(file_path, arcname)

print(f"Successfully created zip file at {zip_filename}")
