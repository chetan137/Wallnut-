"""
test_single_voucher.py - Tests pushing one voucher to Tally to see raw response.
"""
import requests, csv

TALLY_URL = 'http://localhost:9000'
COMPANY   = 'Wallnut3'

def escape_xml(val):
    return str(val).replace('&','&amp;').replace('<','&lt;').replace('>','&gt;').replace('"','&quot;').replace("'",'&apos;')

with open('vouchers_to_create.csv','r',encoding='utf-8') as f:
    row = list(csv.DictReader(f))[0]

qty = int(float(row['Qty']))
rate = int(float(row['Rate']))
amt = qty * rate
dealer = escape_xml(row['Dealer'])
product = escape_xml(row['Product'])
uom = escape_xml(row['UOM'])
so = escape_xml(row['SalesOfficer'])
area = escape_xml(row['Area'])
state = escape_xml(row['State'])
date = row['Date']
vchno = escape_xml(row['VchNo'])
narration = f'Item: {product} | Qty: {qty} {uom} | Rate: {rate} | Area: {area} | SO: {so} | State: {state}'

xml = f'''<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
 <HEADER>
  <TALLYREQUEST>Import Data</TALLYREQUEST>
 </HEADER>
 <BODY>
  <IMPORTDATA>
   <REQUESTDESC>
    <REPORTNAME>Vouchers</REPORTNAME>
    <STATICVARIABLES>
     <SVCURRENTCOMPANY>{escape_xml(COMPANY)}</SVCURRENTCOMPANY>
    </STATICVARIABLES>
   </REQUESTDESC>
   <REQUESTDATA>
    <TALLYMESSAGE xmlns:UDF="TallyUDF">
     <VOUCHER VCHTYPE="Sales" ACTION="Create">
      <DATE>{date}</DATE>
      <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
      <VOUCHERNUMBER>{vchno}</VOUCHERNUMBER>
      <PARTYLEDGERNAME>{dealer}</PARTYLEDGERNAME>
      <NARRATION>{narration}</NARRATION>
      <ALLLEDGERENTRIES.LIST>
       <LEDGERNAME>{dealer}</LEDGERNAME>
       <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
       <ISPARTYLEDGER>Yes</ISPARTYLEDGER>
       <AMOUNT>-{amt}</AMOUNT>
      </ALLLEDGERENTRIES.LIST>
      <ALLLEDGERENTRIES.LIST>
       <LEDGERNAME>Sales Accounts</LEDGERNAME>
       <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
       <AMOUNT>{amt}</AMOUNT>
      </ALLLEDGERENTRIES.LIST>
     </VOUCHER>
    </TALLYMESSAGE>
   </REQUESTDATA>
  </IMPORTDATA>
 </BODY>
</ENVELOPE>'''

print('Sending test voucher...')
print(f'Date: {date} | Dealer: {row["Dealer"]} | VchNo: {row["VchNo"]}')
print()
print('XML being sent:')
print(xml[:500])
print('...')

res = requests.post(TALLY_URL, data=xml.encode('utf-8'), headers={'Content-Type':'text/xml;charset=UTF-8'}, timeout=15)
print()
print('Tally Response:')
print(res.text)
