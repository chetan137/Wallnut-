import requests

xml = """
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>CustomDaybook</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
        <SVCURRENTCOMPANY>Wallnut Industries</SVCURRENTCOMPANY>
        <SVFROMDATE>20260401</SVFROMDATE>
        <SVTODATE>20260630</SVTODATE>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <REPORT NAME="CustomDaybook" ISMODIFY="No">
            <FORMS>CustomDaybook</FORMS>
          </REPORT>
          <FORM NAME="CustomDaybook">
            <TOPPARTS>CustomDaybook Body</TOPPARTS>
          </FORM>
          <PART NAME="CustomDaybook Body">
            <LINES>CustomDaybook Line</LINES>
            <REPEAT>CustomDaybook Line : CustomDaybook Collection</REPEAT>
            <SCROLLED>Vertical</SCROLLED>
          </PART>
          <LINE NAME="CustomDaybook Line">
            <FIELDS>VchNo,VchDate,VchType,PartyName,Amount,Narration</FIELDS>
          </LINE>
          <FIELD NAME="VchNo">
            <SET>$VOUCHERNUMBER</SET>
          </FIELD>
          <FIELD NAME="VchDate">
            <SET>$DATE</SET>
          </FIELD>
          <FIELD NAME="VchType">
            <SET>$VOUCHERTYPENAME</SET>
          </FIELD>
          <FIELD NAME="PartyName">
            <SET>$PARTYLEDGERNAME</SET>
          </FIELD>
          <FIELD NAME="Amount">
            <SET>$AMOUNT</SET>
          </FIELD>
          <FIELD NAME="Narration">
            <SET>$NARRATION</SET>
          </FIELD>
          <COLLECTION NAME="CustomDaybook Collection">
            <TYPE>Voucher</TYPE>
            <FILTER>SalesFilter</FILTER>
          </COLLECTION>
          <SYSTEM TYPE="Formulae" NAME="SalesFilter">
            $VOUCHERTYPENAME CONTAINS "Sales" OR $VOUCHERTYPENAME CONTAINS "Credit Note"
          </SYSTEM>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>
"""

r = requests.post('http://localhost:9000', data=xml.encode('utf-8'))
print(r.text[:1000])
