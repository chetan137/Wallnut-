import requests
import xml.etree.ElementTree as ET
import csv

TALLY_URL = "http://localhost:9000"
COMPANY_NAME = "Wallnut3"

def post_xml(xml_body):
    try:
        response = requests.post(TALLY_URL, data=xml_body.encode('utf-8'))
        return response.text
    except Exception as e:
        return f"<ERRORS>{e}</ERRORS>"

def check_errors(response_text, stage):
    try:
        root = ET.fromstring(response_text)
        errors = root.findtext(".//ERRORS")
        created = root.findtext(".//CREATED")
        line_errors = [e.text for e in root.findall(".//LINEERROR")]

        print(f"[{stage}] Created: {created}, Errors: {errors}")
        if line_errors:
            for e in line_errors:
                print(f"  LINEERROR: {e}")

        if int(errors or 0) > 0 or line_errors:
            print(f"FAILED at {stage}. Check above errors.")
            return False
        return True
    except Exception as e:
        print(f"[{stage}] Failed to parse response: {e}\nResponse: {response_text}")
        return False

def build_envelope(tally_message_content):
    return f"""<ENVELOPE>
 <HEADER>
  <VERSION>1</VERSION>
  <TALLYREQUEST>Import</TALLYREQUEST>
  <TYPE>Data</TYPE>
  <ID>All Masters</ID>
 </HEADER>
 <BODY>
  <DESC>
   <STATICVARIABLES>
    <SVCURRENTCOMPANY>{COMPANY_NAME}</SVCURRENTCOMPANY>
   </STATICVARIABLES>
  </DESC>
  <DATA>
   <TALLYMESSAGE xmlns:UDF="TallyUDF">
    {tally_message_content}
   </TALLYMESSAGE>
  </DATA>
 </BODY>
</ENVELOPE>"""

def create_uom():
    uoms = set()
    with open('products.csv', 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            uoms.add(row['UOM'])

    content = ""
    for u in uoms:
        content += f"""
        <UNIT NAME="{u}" ACTION="Create">
         <NAME>{u}</NAME>
         <ISSIMPLEUNIT>Yes</ISSIMPLEUNIT>
        </UNIT>"""
    return check_errors(post_xml(build_envelope(content)), "Units of Measure")

def create_stock_groups():
    content = """
        <STOCKGROUP NAME="Construction Chemicals" ACTION="Create">
         <NAME.LIST><NAME>Construction Chemicals</NAME></NAME.LIST>
        </STOCKGROUP>"""
    return check_errors(post_xml(build_envelope(content)), "Stock Groups")

def create_stock_items():
    content = ""
    with open('products.csv', 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            content += f"""
        <STOCKITEM NAME="{row['Name']}" ACTION="Alter">
         <NAME.LIST><NAME>{row['Name']}</NAME></NAME.LIST>
         <PARENT>Construction Chemicals</PARENT>
         <BASEUNITS>{row['UOM']}</BASEUNITS>
        </STOCKITEM>"""
    return check_errors(post_xml(build_envelope(content)), "Stock Items")

def create_ledgers():
    content = """
        <LEDGER NAME="Sales Accounts" ACTION="Create">
         <NAME.LIST><NAME>Sales Accounts</NAME></NAME.LIST>
         <PARENT>Sales Accounts</PARENT>
         <ISBILLWISEON>No</ISBILLWISEON>
        </LEDGER>"""

    with open('dealers.csv', 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            content += f"""
        <LEDGER NAME="{row['Name']}" ACTION="Create">
         <NAME.LIST><NAME>{row['Name']}</NAME></NAME.LIST>
         <PARENT>Sundry Debtors</PARENT>
         <LEDSTATENAME>{row['State']}</LEDSTATENAME>
         <ISBILLWISEON>Yes</ISBILLWISEON>
        </LEDGER>"""
    return check_errors(post_xml(build_envelope(content)), "Ledgers (Dealers + Sales)")

if __name__ == '__main__':
    print("Starting Master Creation...")
    if create_uom():
        if create_stock_groups():
            if create_stock_items():
                if create_ledgers():
                    print("ALL MASTERS CREATED SUCCESSFULLY!")
