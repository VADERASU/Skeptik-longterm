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
                        txt_file_path = os.path.join(root, dir_name, txt_file_name)
                        result_file_path = os.path.join(root, dir_name, txt_file_name.replace('.txt', '_result.txt'))
                        if os.path.isfile(result_file_path):
                            process_file(result_file_path, item, txt_file_path)


def process_file(file_path, overview_item, txt_file_path):
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

            cases = content_json.get('cases', [])
            for case in cases:
                fallacies = case.get('fallacies', {}).get('logical_fallacies', [])
                fallacy_count = len(fallacies)
                case['fallacy_count'] = fallacy_count

                # Add bias and reliability
                case['bias'] = overview_item.get('bias')
                case['reliability'] = overview_item.get('Reliability')

                # Perform word count on the text file
                word_count = perform_word_count(txt_file_path)
                case['word_count'] = word_count

                # Calculate fallacies per 1000 words
                fallacies_per_1000_words = (fallacy_count / word_count) * 1000 if word_count != 0 else 0
                case['fallacies_per_1000_words'] = fallacies_per_1000_words

            # Extracting the number from the filename
            base_name = os.path.basename(file_path)
            number = base_name.split('_')[0]
            output_file_path = os.path.join(os.path.dirname(file_path), f'{number}_result.json')

            with open(output_file_path, 'w') as output_file:
                json.dump(content_json, output_file, indent=4)

            print(f"Processed and saved: {output_file_path}")
    except Exception as e:
        print(f"Error processing {file_path}: {e}")


def perform_word_count(txt_file_path):
    try:
        with open(txt_file_path, 'r') as txt_file:
            text = txt_file.read()
            words = text.split()
            return len(words)
    except Exception as e:
        print(f"Error reading {txt_file_path}: {e}")
        return 0


# Replace 'your_directory' with the path to your directory
base_directory = './'
process_files(base_directory)
