import csv
import random
from datetime import datetime, timedelta

NUM_VOUCHERS = 1000
START_DATE = datetime(2026, 4, 1)
END_DATE = datetime(2026, 9, 30)

def generate():
    dealers = []
    with open('dealers.csv', 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            dealers.append(row)
            
    products = []
    with open('products.csv', 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            products.append(row)
            
    with open('vouchers_to_create.csv', 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=['Date', 'Dealer', 'Product', 'Qty', 'Rate', 'State', 'UOM'])
        writer.writeheader()
        
        for _ in range(NUM_VOUCHERS):
            # Choose a random month from April to September and day 1 or 2 for Tally Educational Mode
            month = random.randint(START_DATE.month, END_DATE.month)
            day = random.choice([1, 2])
            d = datetime(2026, month, day)
            date_str = d.strftime('%Y%m%d') # Tally format
            
            dealer = random.choice(dealers)
            product = random.choice(products)
            
            qty = random.randint(10, 500)
            rate = int(product['Rate'])
            
            writer.writerow({
                'Date': date_str,
                'Dealer': dealer['Name'],
                'Product': product['Name'],
                'Qty': qty,
                'Rate': rate,
                'State': dealer['State'],
                'UOM': product['UOM']
            })

if __name__ == '__main__':
    generate()
    print(f"Generated {NUM_VOUCHERS} vouchers in vouchers_to_create.csv")
