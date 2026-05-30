import numpy as np
from sklearn.tree import DecisionTreeClassifier
import pickle
import os

def train():
    print("Generating synthetic city crime and demographic dataset...")
    # Set seed for reproducibility
    np.random.seed(42)
    
    n_samples = 1500
    
    # Coordinates in Bangkok/city grid (around Lat 13.75, Lon 100.50)
    latitudes = np.random.uniform(13.70, 13.80, n_samples)
    longitudes = np.random.uniform(100.40, 100.60, n_samples)
    
    # Categorical feature maps
    category_map = {"theft": 0, "assault": 1, "burglary": 2, "fraud": 3}
    income_map = {"low": 0, "medium": 1, "high": 2}
    race_map = {"minority": 0, "majority": 1}
    
    # Randomly select features
    categories = np.random.choice([0, 1, 2, 3], n_samples)
    incomes = np.random.choice([0, 1, 2], n_samples, p=[0.3, 0.5, 0.2])
    races = np.random.choice([0, 1], n_samples, p=[0.3, 0.7])
    
    # Calculate probabilities with systemic/demographic bias
    crime_labels = []
    for lat, lon, cat, inc, rac in zip(latitudes, longitudes, categories, incomes, races):
        # Base probability from coordinates & crime category
        prob = 0.25
        if cat == 0:  # theft
            prob += 0.15
        elif cat == 1: # assault
            prob += 0.10
            
        # Demographic disparities (synthetic historical policing bias)
        if inc == 0:  # low income
            prob += 0.25
        if rac == 0:  # minority
            prob += 0.30
            
        prob = min(0.95, max(0.05, prob))
        # Draw label
        crime_labels.append(np.random.binomial(1, prob))
        
    X = np.column_stack((latitudes, longitudes, categories, incomes, races))
    y = np.array(crime_labels)
    
    print("Training scikit-learn DecisionTreeClassifier...")
    clf = DecisionTreeClassifier(max_depth=5, random_state=42)
    clf.fit(X, y)
    
    # Test predictions and demographic parity differences
    print("Verifying trained model features...")
    # Privileged input: High income, majority race, theft, at center coord
    X_privileged = np.array([[13.7563, 100.5018, 0, 2, 1]]) # category: theft, income: high, race: majority
    prob_privileged = clf.predict_proba(X_privileged)[0][1]
    
    # Unprivileged input: Low income, minority race, theft, at center coord
    X_unprivileged = np.array([[13.7563, 100.5018, 0, 0, 0]]) # category: theft, income: low, race: minority
    prob_unprivileged = clf.predict_proba(X_unprivileged)[0][1]
    
    dp_diff = abs(prob_unprivileged - prob_privileged)
    print(f"   Privileged predicted probability: {prob_privileged:.4f}")
    print(f"   Unprivileged predicted probability: {prob_unprivileged:.4f}")
    print(f"   Demographic Parity Difference: {dp_diff:.4f}")
    
    # Save the model
    model_data = {
        "classifier": clf,
        "category_map": category_map,
        "income_map": income_map,
        "race_map": race_map
    }
    
    model_path = os.path.join(os.path.dirname(__file__), "model.pkl")
    with open(model_path, "wb") as f:
        pickle.dump(model_data, f)
        
    print(f"Successfully serialized model and mappings to {model_path}!")

if __name__ == "__main__":
    train()
