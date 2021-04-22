export const reportTemplate = `
<!DOCTYPE html>
<html lang="en-US">

  <head>
    <title>Xpub Scan Report - {xpub}</title>
    <style>
      body {
        font-family: Arial, Helvetica, sans-serif;
        margin: 0px;
      }

      * {
        margin: 0;
        margin-bottom: 6px;
        padding: 0;
      }

      .monospaced {
        font-family: FreeMono, monospace;
      }

      .meta {
        font-size: 1em;
        margin: 2em;
      }

      .warning {
        width: 100%;
        color: #EA5231;
        font-size: 1.4em;
        text-align: center;
      }

      a {
        color: inherit;
        text-decoration: none;
      }

      a:hover {
        color: #a62020;
        font-weight: normal;
        text-decoration: none;
      }

      a:visited {
        color: #666;
        font-weight: normal;
        text-decoration: none;
      }

      .tooltip {
        position: relative;
        display: inline-block;
        border-bottom: 1px dotted black;
      }

      .tooltip .tooltiptext {
        visibility: hidden;
        width: 100px;
        background-color: black;
        color: #fff;
        text-align: center;
        padding: 5px;
        border-radius: 6px;

        position: absolute;
        z-index: 1;
      }

      .tooltip:hover .tooltiptext {
        visibility: visible;
      }

      h1 {
        text-align: center;
      }

      h2 {
        text-align: center;
        font-size: 1.1em;
        font-weight: 100;
      }
    
      ul {
        list-style: none;
      }

      .summary_empty {
        color: #666 !important;
      }

      .summary_non_empty {
        font-weight: bold !important;
      }

      .comparison_mismatch {
        color: #cc0000 !important;
      }

      strong {
        font-weight: bold;
      }

      em {
        font-style: italic;
      }

      /* table | from https://codepen.io/jackrugile/pen/EyABe */

      table {
        background: #f5f5f5;
        border-collapse: collapse;
        font-size: 11px;
        margin: 30px auto;
        text-align: left;
        width: 1000px;
      }

      th {
        background: linear-gradient(#777, #444);
        border-left: 1px solid #555;
        border-right: 1px solid #777;
        border-top: 1px solid #555;
        border-bottom: 1px solid #333;
        box-shadow: inset 0 1px 0 #999;
        color: #fff;
        font-weight: bold;
        padding: 10px 15px;
        position: relative;
        text-shadow: 0 1px 0 #000;
      }

      th:after {
        background: linear-gradient(rgba(255, 255, 255, 0), rgba(255, 255, 255, .08));
        content: '';
        display: block;
        height: 25%;
        left: 0;
        margin: 1px 0 0 0;
        position: absolute;
        top: 25%;
        width: 100%;
      }

      th:first-child {
        border-left: 1px solid #777;
        box-shadow: inset 1px 1px 0 #999;
      }

      th:last-child {
        box-shadow: inset -1px 1px 0 #999;
      }

      td {
        border-right: 1px solid #fff;
        border-left: 1px solid #e8e8e8;
        border-top: 1px solid #fff;
        border-bottom: 1px solid #e8e8e8;
        padding: 10px 15px;
        position: relative;
        transition: all 300ms;
      }

      td:first-child {
        box-shadow: inset 1px 0 0 #fff;
      }

      td:last-child {
        border-right: 1px solid #e8e8e8;
        box-shadow: inset -1px 0 0 #fff;
      }

      tr:nth-child(odd) td {
        background: #f1f1f1;
      }

      tr:last-of-type td {
        box-shadow: inset 0 -1px 0 #fff;
      }

      tr:last-of-type td:first-child {
        box-shadow: inset 1px -1px 0 #fff;
      }

      tr:last-of-type td:last-child {
        box-shadow: inset -1px -1px 0 #fff;
      }
      
      .tabs{
          width: 98%;
          display: block;
          position: relative;
      }
      
      /* tabs | from https://codepen.io/dhs/pen/diasg */

      .tabs .tab{
          float: left;
          display: block;
      }
      
      .tabs .tab>input[type="radio"] {
          position: absolute;
          top: -9999px;
          left: -9999px;
      }
      
      .tabs .tab>label {
          display: block;
          padding: 6px 21px;
          font-size: 12px;
          text-transform: uppercase;
          cursor: pointer;
          position: relative;
          color: #FFF;
          background: #303030;
      }
      
      .tabs .content {
          display: none;
          overflow: hidden;
          width: 100%;
          position: absolute;
          top: 27px;
          left: 0;
          
          opacity:0;
          transition: opacity 400ms ease-out;
      }
      
      .tabs>.tab>[id^="tab"]:checked + label {
          top: 0;
          background: #4A83FD;
          color: #F5F5F5;
      }
      
      .tabs>.tab>[id^="tab"]:checked ~ [id^="tab-content"] {
          display: block;
        
          opacity: 1;
          transition: opacity 400ms ease-out;
      }
    </style>
  </head>

  <body>
    <br />
    <h1>Xpub Scan Report</h1>
    <h2 class="monospaced">{xpub}</h2>
    
    <div class="meta">
      <ul>
        <li><strong>Currency:</strong> {currency}</li>
        <li><strong>Analysis date:</strong> {analysis_date}</li>
        <li><strong>Provider:</strong> {provider} ({provider_url})</li>
        <li><strong>Gap limit:</strong> {gap_limit}</li>
        <li><strong>Xpub Scan version:</strong> {version}</li>
      </ul>
    </div>

    <ul class="tabs">

    <li class="tab">
    <input type="radio" name="tabs" checked="checked" id="tab1" />
    <label for="tab1">Summary</label>
    <div id="tab-content1" class="content">
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Total Balance</th>
          </tr>
        </thead>
        <tbody>
          {summary}
        </tbody>
      </table>
    </div>
    </li>

    <li class="tab">
    <input type="radio" name="tabs" id="tab2" />
    <label for="tab2">Addresses</label>
    <div id="tab-content2" class="content">
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Derivation</th>
            <th>Address</th>
            <th>Balance</th>
            <th>Funded</th>
            <th>Spent</th>
          </tr>
        </thead>
        <tbody>
          {addresses}
        </tbody>
      </table>
    </div>
    </li>

    <li class="tab">
    <input type="radio" name="tabs" id="tab3" />
    <label for="tab3">Transactions</label>
    <div id="tab-content3" class="content">
    <div class="warning">{warning}</div>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Block</th>
            <th>Tx id</th>
            <th>Address</th>
            <th>Amount</th>
            <th>Type</th>
          </tr>
        </thead>
        <tbody>
          {transactions}
        </tbody>
      </table>
    </div>
    </li>

    {comparisons}
    {diff}
    </ul>

  </body>

</html>
`
