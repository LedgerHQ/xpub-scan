export const reportTemplate = `
<!DOCTYPE html>
<html lang="en-US">

  <head>
    <title>Xpub Scan Report - {xpub}</title>
    <style>
      body {
        font-family: Arial, Helvetica, sans-serif;
      }

      .monospaced {
        font-family: FreeMono, monospace;
      }

      .meta {
        font-family: Optima;
        font-size: 1em;
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
        width: 120px;
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

      /* From    https://codepen.io/jackrugile/pen/EyABe    */
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
    </style>
  </head>

  <body>

    <h1>Xpub Scan Report</h1>

    <div class="meta">
      <ul>
        <li><strong>Xpub:</strong> <span class="monospaced">{xpub}</span></li>
        <li><strong>Currency:</strong> {currency}</li>
        <li><strong>Analysis date:</strong> {analysis_date}</li>
        <li><strong>Provider:</strong> {provider} ({provider_url})</li>
        <li><strong>Gap limit:</strong> {gap_limit}</li>
        <li><strong>Xpub Scan version:</strong> {version}</li>
      </ul>
    </div>

    <ul>
      <li><a href="#anchor_addresses">Active Addresses</a></li>
      <li><a href="#anchor_transactions">Transactions</a></li>
      <li><a href="#anchor_comparisons">Comparisons</a></li>
    </ul>


    <h1 id="anchor_summary">Summary</h1>
    <div class="summary">
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

    <br />
    <h1 id="anchor_addresses">Active Addresses</h1>
    <div class="addresses">
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
          $addresses$
        </tbody>
      </table>
    </div>

    <br />
    <h1 id="anchor_transactions">Transactions</h1>
    <div class="transactions">
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
          {transaction}
        </tbody>
      </table>
    </div>

    <br />
    {comparisons}

  </body>

</html>
`