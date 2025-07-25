import json
import zipfile
import os

file_ignore = [".gitignore", "package.py"]
dir_ignore = ["deprecated", ".idea", "node_modules", ".git", "packages"]

dir_name = os.path.dirname(os.path.realpath(__file__))

with open(os.path.join(dir_name, "manifest.json"), "r") as json_file:
    manifest = json.load(json_file)
zip_file_name = os.path.join(dir_name, f"packages/package-{manifest['version']}.zip")

files_written = 0
# un: 3263667
# zip: 1704884
# bzip: 1693187
# lzma: 1594970
# create a ZipFile object
with zipfile.ZipFile(zip_file_name, 'w', compression=zipfile.ZIP_LZMA) as zip_obj:
    # Iterate over all the files in directory
    for folder_name, subfolders, filenames in os.walk(dir_name):
        folder_allowed = True
        for idir in dir_ignore:
            if idir in folder_name:
                folder_allowed = False
                break
        if folder_allowed:
            for filename in filenames:
                if filename not in file_ignore:
                    # create complete filepath of file in directory
                    file_path = os.path.join(folder_name, filename)
                    print(file_path)
                    # Add file to zip
                    zip_obj.write(file_path, os.path.relpath(file_path, dir_name))
                    files_written += 1
print(f"\nWrote {files_written} file(s) to {zip_file_name} totaling {os.path.getsize(zip_file_name):,} bytes")
