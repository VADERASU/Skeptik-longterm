import json
import pandas as pd
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.linear_model import LinearRegression, Ridge
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
linear_model = LinearRegression()
linear_model.fit(X_train, y_train)

# Train a Ridge regression model
ridge_model = Ridge()
ridge_model.fit(X_train, y_train)

# Make predictions
linear_y_pred = linear_model.predict(X_test)
ridge_y_pred = ridge_model.predict(X_test)

# Evaluate the linear regression model
linear_mse = mean_squared_error(y_test, linear_y_pred)
linear_r2 = r2_score(y_test, linear_y_pred)
print(f"Linear Regression - Mean Squared Error: {linear_mse}")
print(f"Linear Regression - R^2 Score: {linear_r2}")

# Evaluate the Ridge regression model
ridge_mse = mean_squared_error(y_test, ridge_y_pred)
ridge_r2 = r2_score(y_test, ridge_y_pred)
print(f"Ridge Regression - Mean Squared Error: {ridge_mse}")
print(f"Ridge Regression - R^2 Score: {ridge_r2}")

# Cross-validation for linear regression
linear_cv_scores = cross_val_score(linear_model, X, y, cv=5, scoring='neg_mean_squared_error')
linear_cv_mse = -linear_cv_scores.mean()
linear_cv_r2 = cross_val_score(linear_model, X, y, cv=5, scoring='r2').mean()
print(f"Linear Regression - Cross-Validation Mean Squared Error: {linear_cv_mse}")
print(f"Linear Regression - Cross-Validation R^2 Score: {linear_cv_r2}")

# Cross-validation for Ridge regression
ridge_cv_scores = cross_val_score(ridge_model, X, y, cv=5, scoring='neg_mean_squared_error')
ridge_cv_mse = -ridge_cv_scores.mean()
ridge_cv_r2 = cross_val_score(ridge_model, X, y, cv=5, scoring='r2').mean()
print(f"Ridge Regression - Cross-Validation Mean Squared Error: {ridge_cv_mse}")
print(f"Ridge Regression - Cross-Validation R^2 Score: {ridge_cv_r2}")

# Plot the results
plt.figure(figsize=(10, 6))

# Plot actual vs predicted fallacy count for Ridge Regression
plt.subplot(1, 2, 1)
plt.scatter(y_test, ridge_y_pred)
plt.plot([y.min(), y.max()], [y.min(), y.max()], '--', color='red', linewidth=2)
plt.xlabel('Actual Fallacy Count')
plt.ylabel('Predicted Fallacy Count')
plt.title('Actual vs Predicted Fallacy Count (Ridge Regression)')

# Plot residuals for Ridge Regression
plt.subplot(1, 2, 2)
ridge_residuals = y_test - ridge_y_pred
sns.histplot(ridge_residuals, kde=True)
plt.xlabel('Residuals')
plt.ylabel('Frequency')
plt.title('Residuals Distribution (Ridge Regression)')

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
