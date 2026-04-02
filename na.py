import pandas as pd
    
df = pd.read_csv('product_deals_dataset1.csv')
for index, row in df.iterrows():
    if row['won_lost'] == 1:
        reward = 100 - row['discount_offered']
    else:
        reward =  row['discount_offered'] - 100
    print(f"Original: {row['discount_offered']}, Won/Lost: {row['won_lost']}, Reward: {reward}")
    df.at[index, 'reward'] = reward
df.to_csv('product_deals_dataset1.csv', index=False)