export const reportTemplate = `
<!DOCTYPE html>
<html lang="en-US">

  <head>
    <title>Xpub Scan Report - {xpub}</title>
    <style>
      body {
        background-color: {body_background_color};
        font-family: Lucida console, Helvetica, sans-serif;
      }

      * {
        margin: 0;
        margin-bottom: 6px;
        padding: 0;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }

      .title {
        padding-top: 1em;
        display: block;
        margin-left: auto;
        margin-right: auto;
        text-align: center;
      }

      .monospaced {
        font-family: FreeMono, monospace;
      }

      #warning_range {
        margin: 0 auto;
        padding: 4px;
        border: 2px solid #E51C10;
        background-color: #FFB3B3;
        width: 90%;
        text-align: center;
        font-family: Georgia, serif;
        font-style: italic;
      }

      .meta {
        font-size: 1em;
        margin: 2em;
        line-height: 90%;
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
        border-bottom: 1px dotted;
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

      .label {
        font-size: 0.95em;
        display: block;
        padding: 5px 5px;
        text-align: center;
        border-radius: 6px;
      }

      .match_label {
        color: #053605;
        background-color: #a9dda9;
        box-shadow: rgba(16, 90, 7, 1) 1px 1px 2px;
      }

      .mismatch_label {
        color: #950a0a;
        background-color: #f7c7c7;
        box-shadow: rgba(169, 63, 63, 1) 1px 1px 2px;
      }

      .skipped_label {
        color: #000000a1;
        background-color: #cdc9c9;
        box-shadow: rgba(51, 51, 51, 1) 1px 1px 2px;
      }

      .summary_empty {
        color: #666 !important;
      }

      .summary_non_empty {
        font-weight: bold !important;
      }

      .failed_operation {
        color: #4e2cb1 !important;
      }

      .token_operation {
        color: #2c4c88 !important;
      }

      .token_details {
        display: block;
        margin: 8px 0;
        padding: 8px;
        line-height: 1.4;
        text-align: center;
        background-color: #dcdefb;
        box-shadow: rgba(14, 41, 133, 1) 1px 1px 2px;
      }

      .token_mismatch {
        color: #950a0a;
        background-color: #f7c7c7;
        box-shadow: rgba(149, 10, 10, 1) 1px 1px 2px;
      }

      .sci_operation {
        color: #214c9c !important;
      }

      .skipped_comparison {
        color: #7d7d7d !important;
      }

      .comparison_mismatch {
        color: #950a0a !important;
      }

      .comparison_aggregated {
        color: #000080 !important;
      }

      /* separator between imported v. actual data, and comparison results */
      .right_sep {
        border-right: 4px solid #ffffff;
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
        content: "";
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
        vertical-align: top;
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
      
      /* tabs | from https://codepen.io/dhs/pen/diasg */

      .tabs{
          display: flex;
          position: relative;
          justify-content: center;
      }
      
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
    <div class="title">
    <a href="https://github.com/LedgerHQ/xpub-scan" target="_blank"><img src="data:image/png;base64, {logo_base_64}"/></a>
    </div>

    <div class="meta">
      <ul>
        <li><strong>Xpub or Address:</strong> {xpub}</li>
        <li><strong>Currency:</strong> {currency}</li>
        <li><strong>Analysis date:</strong> {analysis_date}</li>
        <li><strong>External provider:</strong> {provider} ({provider_url})</li>
        <li><strong>Gap limit:</strong> {gap_limit}</li>
        <li><strong>Scan mode:</strong> {mode} {pre_derivation_size} {derivation_mode}</li>
        <li><strong>Xpub Scan version:</strong> {version}</li>
      </ul>
    </div>

    {warning_range}</br>

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

    {addresses_table}

    {utxos_table}

    {transactions_table}

    {comparisons_table}

    {diff_table}
    </ul>

  </body>

</html>
`;
