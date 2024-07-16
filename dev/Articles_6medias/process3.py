import os
import json


def collect_result_files(base_dir):
    result_files = []
    for root, dirs, files in os.walk(base_dir):
        for file in files:
            if file.endswith('_result.json'):
                result_files.append(os.path.join(root, file))
    return result_files


def combine_json_files(file_paths, output_file):
    combined_data = []

    for file_path in file_paths:
        try:
            with open(file_path, 'r') as file:
                data = json.load(file)
                combined_data.append(data)
        except Exception as e:
            print(f"Error reading {file_path}: {e}")

    try:
        with open(output_file, 'w') as output_file:
            json.dump(combined_data, output_file, indent=4)
        print(f"Combined JSON saved to {output_file.name}")
    except Exception as e:
        print(f"Error writing combined JSON: {e}")


# Replace 'your_directory' with the path to your directory
base_directory = './'
output_file_path = 'combined_results.json'

result_files = collect_result_files(base_directory)
combine_json_files(result_files, output_file_path)
