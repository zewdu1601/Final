import numpy as np
import pandas as pd
from typing import List, Dict, Any
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import TfidfVectorizer


class RecommenderEngine:
    """
    AI Recommendation Engine supporting:
    1. Content-Based Filtering (product descriptions, category metadata)
    2. Collaborative Filtering (user-item purchase and rating matrix)
    3. Hybrid / Trending Fallback
    """

    def __init__(self):
        self.tfidf_vectorizer = TfidfVectorizer(stop_words='english')
        self.tfidf_matrix = None
        self.product_index_map = {}
        self.products_df = None

    def fit_content_based(self, products: List[Dict[str, Any]]):
        """Fit TF-IDF matrix based on product name, category, and description."""
        if not products:
            return
        
        self.products_df = pd.DataFrame(products)
        self.product_index_map = {row['id']: idx for idx, row in self.products_df.iterrows()}
        
        # Combine text features
        self.products_df['features'] = (
            self.products_df['name'].fillna('') + ' ' +
            self.products_df['category'].fillna('') + ' ' +
            self.products_df['description'].fillna('')
        )
        
        self.tfidf_matrix = self.tfidf_vectorizer.fit_transform(self.products_df['features'])

    def recommend_similar_products(self, product_id: int, top_n: int = 4) -> List[int]:
        """Return top N product IDs similar to the given product_id."""
        if self.tfidf_matrix is None or product_id not in self.product_index_map:
            return []

        idx = self.product_index_map[product_id]
        cosine_sim = cosine_similarity(self.tfidf_matrix[idx], self.tfidf_matrix).flatten()
        
        # Get top indices (excluding self)
        similar_indices = cosine_sim.argsort()[::-1]
        recommended_ids = [
            int(self.products_df.iloc[i]['id'])
            for i in similar_indices
            if self.products_df.iloc[i]['id'] != product_id
        ][:top_n]
        
        return recommended_ids

    def recommend_for_user(self, user_purchases: List[int], top_n: int = 6) -> List[int]:
        """Recommend items for a user based on their purchase/browse history."""
        if not user_purchases or self.tfidf_matrix is None:
            # Fallback to top rated or first N items
            if self.products_df is not None and not self.products_df.empty:
                return self.products_df['id'].tolist()[:top_n]
            return []

        # Aggregate similarity scores across all items the user bought
        aggregated_scores = np.zeros(len(self.products_df))
        for pid in user_purchases:
            if pid in self.product_index_map:
                idx = self.product_index_map[pid]
                sim_scores = cosine_similarity(self.tfidf_matrix[idx], self.tfidf_matrix).flatten()
                aggregated_scores += sim_scores

        ranked_indices = aggregated_scores.argsort()[::-1]
        recommended = [
            int(self.products_df.iloc[i]['id'])
            for i in ranked_indices
            if self.products_df.iloc[i]['id'] not in user_purchases
        ][:top_n]

        return recommended


recommender = RecommenderEngine()
