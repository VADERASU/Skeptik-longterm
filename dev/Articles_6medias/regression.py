import json
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error, r2_score
import matplotlib.pyplot as plt
import seaborn as sns

# Load the combined JSON data
with open('combined_results.json', 'r') as file:
    data = json.load(file)

# Extract the relevant fields
extracted_data = []
for item in data:
    if isinstance(item, dict) and 'bias' in item and 'reliability' in item and 'fallacy_count' in item:
        extracted_data.append({
            'bias': item['bias'],
            'reliability': item['reliability'],
            'fallacy_count': item['fallacy_count']
        })

# Convert the extracted data into a DataFrame
df = pd.DataFrame(extracted_data)

# Drop any rows with missing values
df.dropna(inplace=True)

# Split the data into features and target
X = df[['bias', 'reliability']]
y = df['fallacy_count']

# Split the data into training and testing sets
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Train a linear regression model
model = LinearRegression()
model.fit(X_train, y_train)

# Make predictions
y_pred = model.predict(X_test)

# Evaluate the model
mse = mean_squared_error(y_test, y_pred)
r2 = r2_score(y_test, y_pred)

print(f"Mean Squared Error: {mse}")
print(f"R^2 Score: {r2}")

# Plot the results
plt.figure(figsize=(10, 6))

# Plot actual vs predicted fallacy count
plt.subplot(1, 2, 1)
plt.scatter(y_test, y_pred)
plt.plot([y.min(), y.max()], [y.min(), y.max()], '--', color='red', linewidth=2)
plt.xlabel('Actual Fallacy Count')
plt.ylabel('Predicted Fallacy Count')
plt.title('Actual vs Predicted Fallacy Count')

# Plot residuals
plt.subplot(1, 2, 2)
residuals = y_test - y_pred
sns.histplot(residuals, kde=True)
plt.xlabel('Residuals')
plt.ylabel('Frequency')
plt.title('Residuals Distribution')

plt.tight_layout()
plt.show()

# Heatmap of correlation matrix
plt.figure(figsize=(8, 6))
sns.heatmap(df.corr(), annot=True, cmap='coolwarm', fmt='.2f')
plt.title('Correlation Matrix')
plt.show()

# Pairplot to visualize the relationships between variables
sns.pairplot(df)
plt.show()
