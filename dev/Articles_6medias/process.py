import os
import json
import requests


def send_content_to_backend(content, debug=False):
    if debug:
        # Placeholder for debugging, print the content instead of sending it
        print(f"Debug: Would send content to backend: {content[:100]}...")  # Print the first 100 characters
        return {"debug": "This is a debug response"}
    else:
        """
        load API keys and other headers here.
        """
        backend_url = 'OpenAI API endpoint'  # Replace with actual backend URL
        response = requests.post(backend_url, json={'content': content})
        return response.json()


def process_folder(folder_path, debug=False):
    json_file = os.path.join(folder_path, 'overview.json')

    if not os.path.isfile(json_file):
        print(f"No overview.json found in {folder_path}")
        return

    try:
        with open(json_file, 'r') as file:
            data = json.load(file)
    except json.JSONDecodeError as e:
        print(f"Error decoding JSON from {json_file}: {e}")
        return

    for item in data:
        content_file = os.path.join(folder_path, item['content'])

        if not os.path.isfile(content_file):
            print(f"No content file found: {content_file}")
            continue

        with open(content_file, 'r') as file:
            content = file.read()

        response = send_content_to_backend(content, debug=debug)
        result_file = os.path.join(folder_path, f"{os.path.splitext(item['content'])[0]}_result.txt")

        with open(result_file, 'w') as file:
            json.dump(response, file, indent=2)


def main():
    base_directory = './'
    debug_mode = True  # Set to False to actually send to backend

    for folder_name in os.listdir(base_directory):
        folder_path = os.path.join(base_directory, folder_name)

        if os.path.isdir(folder_path):
            process_folder(folder_path, debug=debug_mode)


if __name__ == "__main__":
    main()
