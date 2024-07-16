import json
import requests

# Function to send content to the backend and return the response
def send_content_to_backend(content, debug=False):
    if debug:
        # Placeholder for debugging, print the content instead of sending it
        print(f"Debug: Would send content to backend: {content[:100]}...")  # Print the first 100 characters
        return {"debug": "This is a debug response"}
    else:
        """
        load API keys and other headers here.
        """
        backend_url = 'OpenAI API endpoint'
        response = requests.post(backend_url, json={'content': content})
        return response.json()

# Function to process the JSON file and send content to the backend
def process_json_file(file_path, debug=False):
    with open(file_path, 'r') as file:
        data = json.load(file)

    results = []

    for source, articles in data.items():
        for article in articles:
            content = article.get('content')
            if content is not None:
                response = send_content_to_backend(content, debug=debug)
                result = {
                    'source': source,
                    'response': response
                }
                results.append(result)
            else:
                print(f"Warning: 'content' key missing in article from source {source}")

    return results

# Path to the JSON file
file_path = './vaccine-sample.json'

# Set debug mode
debug_mode = True

# Process the JSON file and get the results
results = process_json_file(file_path, debug=debug_mode)

# Print the results
for result in results:
    print(json.dumps(result, indent=2))

# If you want to save the results to a file, uncomment the following lines:
# output_file_path = 'results.json'
# with open(output_file_path, 'w') as output_file:
#     json.dump(results, output_file, indent=2)
