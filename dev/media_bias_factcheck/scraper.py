import requests
from bs4 import BeautifulSoup
import os

# Create a directory to save the HTML files
if not os.path.exists('html_sources'):
    os.makedirs('html_sources')

# Base URL
base_url = "https://mediabiasfactcheck.com/filtered-search/?pg="

# Loop through all pages (assuming there are 80 pages)
for page_number in range(1, 81):
    # Construct the URL for the current page
    url = f"{base_url}{page_number}"

    # Make a GET request to fetch the raw HTML content
    response = requests.get(url)

    # Check if the request was successful
    if response.status_code == 200:
        # Save the HTML content to a file
        with open(f'html_sources/page_{page_number}.html', 'w', encoding='utf-8') as file:
            file.write(response.text)
        print(f"Downloaded page {page_number}")
    else:
        print(f"Failed to download page {page_number}")

print("Download complete.")
