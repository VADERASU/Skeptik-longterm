import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error, r2_score

# Load the dataset
df = pd.read_csv('results.csv')

# Define feature columns and target columns
feature_columns = ['bias', 'reliability']
target_columns = ['fallacy_count', 'fallacies_per_1000_words', 'total_sentences_affected', 'total_sentences_affected_per_1000_words']

# Prepare the dataset
X = df[feature_columns]
y_fallacy_count = df['fallacy_count']
y_fallacies_per_1000_words = df['fallacies_per_1000_words']
y_total_sentences_affected = df['total_sentences_affected']
y_total_sentences_affected_per_1000_words = df['total_sentences_affected_per_1000_words']

# Split the dataset into training and testing sets
X_train, X_test, y_train_fallacy_count, y_test_fallacy_count = train_test_split(X, y_fallacy_count, test_size=0.2, random_state=42)
X_train, X_test, y_train_fallacies_per_1000_words, y_test_fallacies_per_1000_words = train_test_split(X, y_fallacies_per_1000_words, test_size=0.2, random_state=42)
X_train, X_test, y_train_total_sentences_affected, y_test_total_sentences_affected = train_test_split(X, y_total_sentences_affected, test_size=0.2, random_state=42)
X_train, X_test, y_train_total_sentences_affected_per_1000_words, y_test_total_sentences_affected_per_1000_words = train_test_split(X, y_total_sentences_affected_per_1000_words, test_size=0.2, random_state=42)

# Initialize and train linear regression models for each target
model_fallacy_count = LinearRegression()
model_fallacies_per_1000_words = LinearRegression()
model_total_sentences_affected = LinearRegression()
model_total_sentences_affected_per_1000_words = LinearRegression()

model_fallacy_count.fit(X_train, y_train_fallacy_count)
model_fallacies_per_1000_words.fit(X_train, y_train_fallacies_per_1000_words)
model_total_sentences_affected.fit(X_train, y_train_total_sentences_affected)
model_total_sentences_affected_per_1000_words.fit(X_train, y_train_total_sentences_affected_per_1000_words)

# Make predictions
y_pred_fallacy_count = model_fallacy_count.predict(X_test)
y_pred_fallacies_per_1000_words = model_fallacies_per_1000_words.predict(X_test)
y_pred_total_sentences_affected = model_total_sentences_affected.predict(X_test)
y_pred_total_sentences_affected_per_1000_words = model_total_sentences_affected_per_1000_words.predict(X_test)

# Evaluate the models
print("Fallacy Count Model:")
print("R²:", r2_score(y_test_fallacy_count, y_pred_fallacy_count))
print("MSE:", mean_squared_error(y_test_fallacy_count, y_pred_fallacy_count))

print("\nFallacies per 1000 Words Model:")
print("R²:", r2_score(y_test_fallacies_per_1000_words, y_pred_fallacies_per_1000_words))
print("MSE:", mean_squared_error(y_test_fallacies_per_1000_words, y_pred_fallacies_per_1000_words))

print("\nTotal Sentences Affected Model:")
print("R²:", r2_score(y_test_total_sentences_affected, y_pred_total_sentences_affected))
print("MSE:", mean_squared_error(y_test_total_sentences_affected, y_pred_total_sentences_affected))

print("\nTotal Sentences Affected per 1000 Words Model:")
print("R²:", r2_score(y_test_total_sentences_affected_per_1000_words, y_pred_total_sentences_affected_per_1000_words))
print("MSE:", mean_squared_error(y_test_total_sentences_affected_per_1000_words, y_pred_total_sentences_affected_per_1000_words))
