import json
import csv

# Load the dataset
with open('./combined_data.json', 'r') as file:
    data = json.load(file)

# Function to calculate fallacies per 1000 words
def calculate_fallacies_per_1000_words(fallacy_count, word_count):
    return (fallacy_count / word_count) * 1000 if word_count != 0 else 0

# Function to calculate total sentences affected by fallacies and normalize by 1000 words
def calculate_sentences_affected(fallacies):
    sentences_affected = set()
    for fallacy, sentences in fallacies.get('sentences', {}).items():
        sentences_affected.update(sentences)
    total_sentences_affected = len(sentences_affected)
    return total_sentences_affected

def calculate_sentences_affected_per_1000_words(total_sentences_affected, word_count):
    return (total_sentences_affected / word_count) * 1000 if word_count != 0 else 0

# Process the dataset
results = []
for entry in data:
    if isinstance(entry, dict) and 'cases' in entry:
        for case in entry['cases']:
            name = case.get('name', 'Unknown')
            bias = case.get('bias', 0)
            reliability = case.get('reliability', 0)
            word_count = case.get('word_count', 0)
            fallacy_count = case.get('fallacy_count', 0)
            fallacies_per_1000_words = calculate_fallacies_per_1000_words(fallacy_count, word_count)

            fallacies = case.get('fallacies', {})
            total_sentences_affected = calculate_sentences_affected(fallacies)
            total_sentences_affected_per_1000_words = calculate_sentences_affected_per_1000_words(total_sentences_affected, word_count)

            results.append({
                'name': name,
                'bias': bias,
                'reliability': reliability,
                'word_count': word_count,
                'fallacy_count': fallacy_count,
                'fallacies_per_1000_words': fallacies_per_1000_words,
                'total_sentences_affected': total_sentences_affected,
                'total_sentences_affected_per_1000_words': total_sentences_affected_per_1000_words
            })

# Save the results to a CSV file
csv_file = 'results.csv'
csv_columns = ['name', 'bias', 'reliability', 'word_count', 'fallacy_count', 'fallacies_per_1000_words', 'total_sentences_affected', 'total_sentences_affected_per_1000_words']

with open(csv_file, 'w', newline='') as csvfile:
    writer = csv.DictWriter(csvfile, fieldnames=csv_columns)
    writer.writeheader()
    for result in results:
        writer.writerow(result)

print(f"Results have been saved to {csv_file}")
