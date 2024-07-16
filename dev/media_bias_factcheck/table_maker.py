import os
import pandas as pd
from bs4 import BeautifulSoup

# Directory containing the HTML files
directory = r'./html_sources/'

# Function to extract table data from HTML and return as DataFrame
def extract_table_from_html(file_path):
    with open(file_path, 'r', encoding='utf-8') as file:
        soup = BeautifulSoup(file, 'html.parser')
        table = soup.find('table', {'id': 'mbfc-table'})

        if table:
            headers = [header.text.strip() for header in table.find_all('th')]
            rows = []

            for row in table.find('tbody').find_all('tr'):
                cells = row.find_all('td')
                rows.append([cell.text.strip() for cell in cells])

            return pd.DataFrame(rows, columns=headers)
        else:
            print(f"Table with id 'mbfc-table' not found in {file_path}")
            return pd.DataFrame()  # Return an empty DataFrame if the table is not found

# List to store data from all HTML files
all_data = []

# Iterate through all HTML files in the directory
for filename in os.listdir(directory):
    if filename.endswith('.html'):
        file_path = os.path.join(directory, filename)
        df = extract_table_from_html(file_path)
        if not df.empty:
            all_data.append(df)

# Concatenate all DataFrames
if all_data:
    combined_df = pd.concat(all_data, ignore_index=True)

    # Save the combined DataFrame to a CSV or Excel file
    output_format = 'csv'  # Change to 'excel' for Excel output
    if output_format == 'csv':
        combined_df.to_csv('mbfc_combined_table.csv', index=False)
        print("Combined table saved as mbfc_combined_table.csv")
    elif output_format == 'excel':
        combined_df.to_excel('mbfc_combined_table.xlsx', index=False)
        print("Combined table saved as mbfc_combined_table.xlsx")
    else:
        print("Unsupported file format. Use 'csv' or 'excel'.")
else:
    print("No data extracted from HTML files.")
