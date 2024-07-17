import os
import json


def concatenate_json_files(base_dir, output_file):
    combined_data = []

    for root, dirs, files in os.walk(base_dir):
        for file in files:
            if file.endswith('.json') and file != "overview.json":
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        combined_data.append(data)
                except json.JSONDecodeError as e:
                    print(f"Error decoding JSON from file {file_path}: {e}")
                except Exception as e:
                    print(f"Unexpected error with file {file_path}: {e}")

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(combined_data, f, indent=4)


if __name__ == "__main__":
    base_directory = "./"
    output_json_file = "combined_data.json"

    concatenate_json_files(base_directory, output_json_file)
    print(f"All JSON files have been concatenated into {output_json_file}")
