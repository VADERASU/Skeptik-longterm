import os
import json


def process_files(base_dir):
    for root, dirs, files in os.walk(base_dir):
        for dir_name in dirs:
            overview_path = os.path.join(root, dir_name, 'overview.json')
            if os.path.isfile(overview_path):
                try:
                    with open(overview_path, 'r') as overview_file:
                        overview_data = json.load(overview_file)
                except json.JSONDecodeError as e:
                    print(f"Error reading {overview_path}: {e}")
                    continue

                for item in overview_data:
                    txt_file_name = item.get('content', '')
                    if txt_file_name:
                        txt_file_path = os.path.join(root, dir_name, txt_file_name.replace('.txt', '_result.txt'))
                        if os.path.isfile(txt_file_path):
                            process_file(txt_file_path, item)


def process_file(file_path, overview_item):
    try:
        with open(file_path, 'r') as file:
            try:
                data = json.load(file)
            except json.JSONDecodeError as e:
                print(f"Error reading {file_path}: {e}")
                return

            choices = data.get('choices')
            if not choices:
                print(f"Missing 'choices' in {file_path}")
                return

            message_content = choices[0].get('message', {}).get('content', '').strip('```json\n```')
            try:
                content_json = json.loads(message_content)
            except json.JSONDecodeError as e:
                print(f"Error parsing content in {file_path}: {e}")
                return

            # Count the number of fallacies
            fallacy_count = len(content_json.get('logical_fallacies', []))
            content_json['fallacy_count'] = fallacy_count

            # Add bias and reliability
            content_json['bias'] = overview_item.get('bias')
            content_json['reliability'] = overview_item.get('Reliability')

            # Extracting the number from the filename
            base_name = os.path.basename(file_path)
            number = base_name.split('_')[0]
            output_file_path = os.path.join(os.path.dirname(file_path), f'{number}_result.json')

            with open(output_file_path, 'w') as output_file:
                json.dump(content_json, output_file, indent=4)

            print(f"Processed and saved: {output_file_path}")
    except Exception as e:
        print(f"Error processing {file_path}: {e}")


# Replace 'your_directory' with the path to your directory
base_directory = './'
process_files(base_directory)
