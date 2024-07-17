import json
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.tree import DecisionTreeRegressor
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, r2_score
import matplotlib.pyplot as plt

# Load the JSON file
with open('combined_results.json') as file:
    data = json.load(file)

# Extract relevant data
records = []
for item in data:
    for case in item['cases']:
        if 'fallacies_per_1000_words' in case:
            fallacies_per_1000_words = case['fallacies_per_1000_words']
            bias = case['bias']
            reliability = case['reliability']
            records.append({
                'fallacies_per_1000_words': fallacies_per_1000_words,
                'bias': bias,
                'reliability': reliability,
            })
        else:
            print(f"Missing fallacies_per_1000_words in case: {case}")

# Convert to DataFrame
df = pd.DataFrame(records)

# Verify data
print(df.head())

# Check if DataFrame is empty
if df.empty:
    raise ValueError("The DataFrame is empty. No valid records found.")

# Features and target
X = df[['bias', 'reliability']]
y = df['fallacies_per_1000_words']

# Split the data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Initialize models
models = {
    'Linear Regression': LinearRegression(),
    'Decision Tree': DecisionTreeRegressor(random_state=42),
    'Random Forest': RandomForestRegressor(random_state=42)
}

# Train models and evaluate
results = {}
for name, model in models.items():
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    mse = mean_squared_error(y_test, y_pred)
    rmse = mse ** 0.5
    r2 = r2_score(y_test, y_pred)
    results[name] = {'Model': model, 'MSE': mse, 'RMSE': rmse, 'R²': r2}

# Display results
for name, result in results.items():
    print(f'{name}:')
    print(f'  MSE: {result["MSE"]}')
    print(f'  RMSE: {result["RMSE"]}')
    print(f'  R²: {result["R²"]}\n')

# Plot results
plt.figure(figsize=(14, 7))
for name, result in results.items():
    y_pred = result['Model'].predict(X_test)
    plt.scatter(y_test, y_pred, label=name)

plt.plot([y.min(), y.max()], [y.min(), y.max()], 'k--', lw=2)
plt.xlabel('Measured')
plt.ylabel('Predicted')
plt.legend()
plt.title('Measured vs Predicted Fallacies per 1000 Words')
plt.show()
