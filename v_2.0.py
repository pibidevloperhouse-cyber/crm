import pandas as pd
import numpy as np
import os
import time
import warnings
import csv
from sklearn.ensemble import GradientBoostingRegressor
from scipy.stats import ks_2samp

warnings.filterwarnings('ignore', category=UserWarning, module='sklearn')
np.set_printoptions(suppress=True)


class SimpleRLAgent:
    def __init__(self, action_bins=(0, 5, 10, 15, 20, 25, 30, 40, 50), alpha=0.1, gamma=0.9, epsilon=0.2):
        """
        A simple tabular Q-learning agent for discount decisions.
        state: discretised intent bucket
        action: one of action_bins (discount percentages)
        """
        self.action_bins = np.array(action_bins)
        self.alpha = alpha
        self.gamma = gamma
        self.epsilon = epsilon

        self.q_table = {}

    def _state_to_bucket(self, intent_score):
        return int(intent_score // 10)

    def act(self, intent_score):
        state = self._state_to_bucket(intent_score)
        if np.random.rand() < self.epsilon:
            action_idx = np.random.randint(len(self.action_bins))
        else:
            q_values = [self.q_table.get((state, a_idx), 0.0) for a_idx in range(len(self.action_bins))]
            action_idx = int(np.argmax(q_values))
        return self.action_bins[action_idx]

    def update(self, intent_score, action, reward, next_intent_score=None):
        print("hi")
        state = self._state_to_bucket(intent_score)
        action_idx = int(np.where(self.action_bins == action)[0][0])

        if next_intent_score is None:
            next_state_q = 0
        else:
            next_state = self._state_to_bucket(next_intent_score)
            next_q_values = [self.q_table.get((next_state, a_idx), 0.0)
                             for a_idx in range(len(self.action_bins))]
            next_state_q = max(next_q_values)

        old_q = self.q_table.get((state, action_idx), 0.0)
        new_q = old_q + self.alpha * (reward + self.gamma * next_state_q - old_q)
        self.q_table[(state, action_idx)] = new_q

        print(f"Updated Q({state},{action}) from {old_q:.2f} to {new_q:.2f} (reward={reward})")

class DynamicDiscountSystem:

    def __init__(self, initial_dataset_path):
        print("Initializing the dynamic discount system...")
        self.real_dataset = pd.read_csv(initial_dataset_path)
        self.real_dataset['timestamp'] = time.time() - np.linspace(0, 100, len(self.real_dataset))

        self.synthetic_dataset = pd.DataFrame()
        self.min_seed_samples = 100
        self.full_ml_threshold = 500
        self.synthetic_batch_size = 1000
        self.blend_ratio = 0.7
        self.recency_decay_factor = 0.95

        self.ml_model = GradientBoostingRegressor(random_state=42)

        

        self.probabilities = {}
        self.rl_agent = SimpleRLAgent() 
        print("System initialized successfully.\n")


    def _get_rule_based_discount(self, intent_score):
        winning_deals = self.real_dataset[self.real_dataset['won_lost'] == 1]

        if intent_score >= 75:
            high_intent_wins = winning_deals[winning_deals['customer_intent_score'] >= 75]  
            if not high_intent_wins.empty:
                min_discount = high_intent_wins['discount_offered'].min()
                max_discount = high_intent_wins['discount_offered'].max()
                normalized_score = (intent_score - 75) / (100 - 75)
                optimal_discount = max_discount - (max_discount - min_discount) * normalized_score
            else:
                optimal_discount = 5
        elif 50 <= intent_score < 75:
            medium_intent_wins = winning_deals[(winning_deals['customer_intent_score'] >= 50) & (winning_deals['customer_intent_score'] < 75)]
            if not medium_intent_wins.empty:
                min_discount = medium_intent_wins['discount_offered'].min()
                max_discount = medium_intent_wins['discount_offered'].max()
                normalized_score = (intent_score - 50) / (75 - 50)
                optimal_discount = max_discount - (max_discount - min_discount) * normalized_score
            else:
                optimal_discount = 10
        else:
            low_intent_wins = winning_deals[winning_deals['customer_intent_score'] < 50]
            if not low_intent_wins.empty:
                min_discount = low_intent_wins['discount_offered'].min()
                max_discount = low_intent_wins['discount_offered'].max()
                normalized_score = (intent_score - 0) / (50 - 0)
                optimal_discount = max_discount - (max_discount - min_discount) * normalized_score
            else:
                optimal_discount = 15
        return optimal_discount

    def _calculate_probabilities(self, df):
        probs = {}
        rules = {
            'intent90_disc0_5': (df['customer_intent_score'] >= 90, df['discount_offered'] <= 5),
            'intent90_disc6_10': (df['customer_intent_score'] >= 90, (df['discount_offered'] > 5) & (df['discount_offered'] <= 10)),
            'intent90_disc11_15': (df['customer_intent_score'] >= 90, (df['discount_offered'] > 10) & (df['discount_offered'] <= 15)),
            'intent90_disc_gt15': (df['customer_intent_score'] >= 90, df['discount_offered'] > 15),

            'intent80_disc0_5': (df['customer_intent_score'] >= 80, df['discount_offered'] <= 5),
            'intent80_disc6_10': (df['customer_intent_score'] >= 80, (df['discount_offered'] > 5) & (df['discount_offered'] <= 10)),
            'intent80_disc11_15': (df['customer_intent_score'] >= 80, (df['discount_offered'] > 10) & (df['discount_offered'] <= 15)),
            'intent80_disc_gt15': (df['customer_intent_score'] >= 80, df['discount_offered'] > 15),

            'intent70_disc0_8': (df['customer_intent_score'] >= 70, df['discount_offered'] <= 8),
            'intent70_disc9_14': (df['customer_intent_score'] >= 70, (df['discount_offered'] > 8) & (df['discount_offered'] <= 14)),
            'intent70_disc15_20': (df['customer_intent_score'] >= 70, (df['discount_offered'] > 14) & (df['discount_offered'] <= 20)),
            'intent70_disc_gt20': (df['customer_intent_score'] >= 70, df['discount_offered'] > 20),

            'intent50_disc0_12': (df['customer_intent_score'] >= 50, df['discount_offered'] <= 12),
            'intent50_disc13_20': (df['customer_intent_score'] >= 50, (df['discount_offered'] > 12) & (df['discount_offered'] <= 20)),
            'intent50_disc21_30': (df['customer_intent_score'] >= 50, (df['discount_offered'] > 20) & (df['discount_offered'] <= 30)),
            'intent50_disc_gt30': (df['customer_intent_score'] >= 50, df['discount_offered'] > 30),

            'intent_lt50_disc0_20': (df['customer_intent_score'] < 50, df['discount_offered'] <= 20),
            'intent_lt50_disc21_35': (df['customer_intent_score'] < 50, (df['discount_offered'] > 20) & (df['discount_offered'] <= 35)),
            'intent_lt50_disc36_45': (df['customer_intent_score'] < 50, (df['discount_offered'] > 35) & (df['discount_offered'] <= 45)),
            'intent_lt50_disc_gt45': (df['customer_intent_score'] < 50, df['discount_offered'] > 45)
        }
        for key, (intent_cond, disc_cond) in rules.items():
            denom_intent = df[intent_cond].shape[0]
            if denom_intent > 0:
                probs[f'p_disc_{key}'] = df[intent_cond & disc_cond].shape[0] / denom_intent
                denom_win = df[intent_cond & disc_cond].shape[0]
                denom_win_gt = df[intent_cond & ~disc_cond].shape[0]
                if denom_win > 0:
                    probs[f'p_win_{key}'] = df[intent_cond & disc_cond & (df['won_lost'] == 1)].shape[0] / denom_win
                if denom_win_gt > 0:
                    probs[f'p_win_gt_{key}'] = df[intent_cond & ~disc_cond & (df['won_lost'] == 1)].shape[0] / denom_win_gt
        self.probabilities = probs

    def generate_synthetic_data(self, base_data, batch_size):
        print(f"Generating {batch_size} synthetic samples with improved intent sampling...")
        self._calculate_probabilities(base_data)

        bins = np.arange(0, 101, 10)
        labels = np.arange(len(bins) - 1)
        
        if base_data.empty:
            base_data = pd.DataFrame({'customer_intent_score': [50]})

        binned_intent = pd.cut(base_data['customer_intent_score'], bins=bins, labels=labels, right=False, include_lowest=True)
        bucket_probs = binned_intent.value_counts(normalize=True).sort_index()

        prob_dist = pd.Series(0.0, index=labels)
        prob_dist.update(bucket_probs)

        new_data = []
        for _ in range(batch_size):
            chosen_bucket = np.random.choice(prob_dist.index, p=prob_dist.values)
            
            lower_bound = chosen_bucket * 10
            upper_bound = lower_bound + 10
            intent = np.random.randint(lower_bound, upper_bound)
            intent = max(1, min(intent, 100))

            disc_prob = np.random.rand()
            win_prob = np.random.rand()
            discount, won_lost = 0, 0

            if intent >= 90:
                if disc_prob <= self.probabilities.get('p_disc_intent90_disc0_5', 0):
                    discount = np.random.randint(0, 6)
                    p_win = self.probabilities.get('p_win_intent90_disc0_5', 0)
                elif disc_prob <= self.probabilities.get('p_disc_intent90_disc6_10', 0):
                    discount = np.random.randint(6, 11)
                    p_win = self.probabilities.get('p_win_intent90_disc6_10', 0)
                elif disc_prob <= self.probabilities.get('p_disc_intent90_disc11_15', 0):
                    discount = np.random.randint(11, 16)
                    p_win = self.probabilities.get('p_win_intent90_disc11_15', 0)
                else:
                    discount = np.random.randint(16, 51)
                    p_win = self.probabilities.get('p_win_intent90_disc_gt15', 0)
                won_lost = 1 if win_prob <= p_win else 0

            elif intent >= 80:
                if disc_prob <= self.probabilities.get('p_disc_intent80_disc0_5', 0):
                    discount = np.random.randint(0, 6)
                    p_win = self.probabilities.get('p_win_intent80_disc0_5', 0)
                elif disc_prob <= self.probabilities.get('p_disc_intent80_disc6_10', 0):
                    discount = np.random.randint(6, 11)
                    p_win = self.probabilities.get('p_win_intent80_disc6_10', 0)
                elif disc_prob <= self.probabilities.get('p_disc_intent80_disc11_15', 0):
                    discount = np.random.randint(11, 16)
                    p_win = self.probabilities.get('p_win_intent80_disc11_15', 0)
                else:
                    discount = np.random.randint(16, 51)
                    p_win = self.probabilities.get('p_win_intent80_disc_gt15', 0)
                won_lost = 1 if win_prob <= p_win else 0

            elif intent >= 70:
                if disc_prob <= self.probabilities.get('p_disc_intent70_disc0_8', 0):
                    discount = np.random.randint(0, 9)
                    p_win = self.probabilities.get('p_win_intent70_disc0_8', 0)
                elif disc_prob <= self.probabilities.get('p_disc_intent70_disc9_14', 0):
                    discount = np.random.randint(9, 15)
                    p_win = self.probabilities.get('p_win_intent70_disc9_14', 0)
                elif disc_prob <= self.probabilities.get('p_disc_intent70_disc15_20', 0):
                    discount = np.random.randint(15, 21)
                    p_win = self.probabilities.get('p_win_intent70_disc15_20', 0)
                else:
                    discount = np.random.randint(21, 51)
                    p_win = self.probabilities.get('p_win_intent70_disc_gt20', 0)
                won_lost = 1 if win_prob <= p_win else 0

            elif intent >= 50:
                if disc_prob <= self.probabilities.get('p_disc_intent50_disc0_12', 0):
                    discount = np.random.randint(0, 13)
                    p_win = self.probabilities.get('p_win_intent50_disc0_12', 0)
                elif disc_prob <= self.probabilities.get('p_disc_intent50_disc13_20', 0):
                    discount = np.random.randint(13, 21)
                    p_win = self.probabilities.get('p_win_intent50_disc13_20', 0)
                elif disc_prob <= self.probabilities.get('p_disc_intent50_disc21_30', 0):
                    discount = np.random.randint(21, 31)
                    p_win = self.probabilities.get('p_win_intent50_disc21_30', 0)
                else:
                    discount = np.random.randint(31, 51)
                    p_win = self.probabilities.get('p_win_intent50_disc_gt30', 0)
                won_lost = 1 if win_prob <= p_win else 0

            else:
                if disc_prob <= self.probabilities.get('p_disc_intent_lt50_disc0_20', 0):
                    discount = np.random.randint(0, 21)
                    p_win = self.probabilities.get('p_win_intent_lt50_disc0_20', 0)
                elif disc_prob <= self.probabilities.get('p_disc_intent_lt50_disc21_35', 0):
                    discount = np.random.randint(21, 36)
                    p_win = self.probabilities.get('p_win_intent_lt50_disc21_35', 0)
                elif disc_prob <= self.probabilities.get('p_disc_intent_lt50_disc36_45', 0):
                    discount = np.random.randint(36, 46)
                    p_win = self.probabilities.get('p_win_intent_lt50_disc36_45', 0)
                else:
                    discount = np.random.randint(46, 51)
                    p_win = self.probabilities.get('p_win_intent_lt50_disc_gt45', 0)
                won_lost = 1 if win_prob <= p_win else 0

            new_data.append({'customer_intent_score': intent, 'discount_offered': discount, 'won_lost': won_lost})
        return pd.DataFrame(new_data)

    def _validate_synthetic_data(self, synth_df, real_df):
        if synth_df.empty or real_df.empty:
            return False
        ks_stat, p_value = ks_2samp(synth_df['customer_intent_score'], real_df['customer_intent_score'])
        return p_value > 0.05


    def get_discount(self, intent_score):
        current_data_size = len(self.real_dataset)
        model_discount = 0

        if current_data_size < self.min_seed_samples:
            print(f"Phase 1: Rule-Based (data size: {current_data_size})")
            model_discount = self._get_rule_based_discount(intent_score)
        
        else:
            if current_data_size < self.full_ml_threshold:
                print(f"Phase 2: Augmented ML (data size: {current_data_size})")
                if self.synthetic_dataset.empty: 
                    self.post_outcome_update(0,0,0, first_run=True) 
                
                training_data = pd.concat([self.real_dataset, self.synthetic_dataset]).reset_index(drop=True)
            else:
                print(f"Phase 3: Full ML (data size: {current_data_size})")
                training_data = self.real_dataset 

            X_train = training_data[['customer_intent_score']]
            y_train = training_data['discount_offered']
            self.ml_model.fit(X_train, y_train)
            predicted_discount = self.ml_model.predict([[intent_score]])[0]
            model_discount = np.clip(predicted_discount, 0, 50)
        
        print(f" -> For intent score {intent_score}:")

        return model_discount
    
    def post_outcome_update(self, intent_score, final_discount, outcome, first_run=False):
        print(f"Outcome received: {'Won' if outcome == 1 else 'Lost'}. Updating system...")
        if not first_run:
            csv_path="product_deals_dataset1.csv"
            new_row = [intent_score, round(final_discount,2), outcome]

            with open(csv_path, 'a', newline='') as f:
                writer = csv.writer(f)
                writer.writerow(new_row)
            if outcome == 1:
                reward = 100 - final_discount
            else:
                reward = final_discount-100
            state = [intent_score]
            self.rl_agent.update(intent_score, action=final_discount, reward=reward)


        print("-" * 50)

        time_diff = self.real_dataset['timestamp'].max() - self.real_dataset['timestamp']
        weights = self.recency_decay_factor ** time_diff
        weighted_real_data = self.real_dataset.sample(n=min(len(self.real_dataset), 500),
                                                     weights=weights, replace=True)

        new_synthetic = self.generate_synthetic_data(weighted_real_data, self.synthetic_batch_size)
        if self._validate_synthetic_data(new_synthetic, self.real_dataset):
            print("Synthetic data passed validation. Updating dataset.")
            self.synthetic_dataset = new_synthetic
        else:
            print("Synthetic data failed validation. Discarding batch.")

        print("-" * 50)

        time_diff = self.real_dataset['timestamp'].max() - self.real_dataset['timestamp']
        weights = self.recency_decay_factor ** time_diff
        weighted_real_data = self.real_dataset.sample(n=min(len(self.real_dataset), 500),
                                                     weights=weights, replace=True)

        new_synthetic = self.generate_synthetic_data(weighted_real_data, self.synthetic_batch_size)
        if self._validate_synthetic_data(new_synthetic, self.real_dataset):
            print("Synthetic data passed validation. Updating dataset.")
            self.synthetic_dataset = new_synthetic

if __name__ == "__main__":
    initial_data_path = 'product_deals_dataset1.csv'
    system = DynamicDiscountSystem(initial_dataset_path=initial_data_path)

    while True:
        try:
            intent_str = input("\nEnter customer intent score (0-100) or 'q' to quit: ")
            if intent_str.lower() == 'q':
                break
            intent = float(intent_str)
            if not 0 <= intent <= 100:
                print("Please enter a score between 0 and 100.")
                continue
        except ValueError:
            print("Invalid input. Please enter a number.")
            continue

        final_discount = system.get_discount(intent)
        print(f"\nSystem recommends a final discount of: {final_discount:.2f}%")

        while True:
            outcome_str = input("Enter outcome (1=Won, 0=Lost): ")
            if outcome_str in ['0', '1']:
                outcome = int(outcome_str)
                break
            else:
                print("Invalid input. Please enter 1 or 0.")
        
        system.post_outcome_update(intent, final_discount, outcome)
