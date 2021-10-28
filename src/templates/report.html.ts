export const reportTemplate = `
<!DOCTYPE html>
<html lang="en-US">

  <head>
    <title>Xpub Scan Report - {xpub}</title>
    <style>
      body {
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
        display: block;
        margin-left: auto;
        margin-right: auto;
        text-align: center;
        width: 100%;
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
    <br />
    <div class="title">
    <a href="https://github.com/LedgerHQ/xpub-scan" target="_blank"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAXsAAAA8CAYAAACHFBprAAAI/XpUWHRSYXcgcHJvZmlsZSB0eXBlIGV4aWYAAHjarZdrjiwpDoX/xypmCRgwj+VgHtLsYJY/n4ms6vtqaaTpDFVGFEmA7XN8bJ79n3+f5198YsrxyVpb6aUEPrnnHgcPLbyfcb8l5Pt9P9U+T/Lz+JPm56XIUOKe3n9bee/yNf554esugyf9YaH2WUjs5x96/qzfflkovrfkFvnz+izUPwul+P4gnwXG61YovdUfXbD93j/vv2Hg7/Gv3H42+7f/K9Fbyj4pxp0kBb6J8GtA8j950vAf7ndhojA4kt995MslAvKnOIUfrHp+ReX76RdUYvszKKm8Mx4Gfg5m+b7/cVz0l/HPgs8N8Q87Qwf57PzT+E6h/urO1985qz3n7Ne7kQshLR+nvly8T0w0Qp7ua4Wr8qc813t1rvbA3gnkK8xgXFO6RKJ/JMuSIUf2vU+ZmJjjjpV7jBOgfKylGnucCWZLyn7JiTX1tFIDtwm8idH4bYvcffvdbkpj4yXMjMJijnR8/OufuP52oXOc8iIezJsmjo9ETwrMcOT8m1kAIueLR3oD/HX9+nFcEwjqDXPDwRHsXcJUPtxyHqULdGKicn9zTer6LECI2FsxRhIIhCJJpUioMVYR4tjAZ7BQc1kyIBDVuLAy5kS21Nii7807Ve7cqPEdRrMAQlNJFWh6GmCVETb4U3ODQ0OTZlUtWrVp11FSyUVLKbW4+I2aaq5aS6211V5HSy03baXV1p7W2+ixJ8RRe+m1t977GGw6WHnw9mDCGBYtWTa1YtWadRsT+sw8dZZZZ3tmn2PFlRY6scqqq62+xpYNlXbeusuuu+2+x4FqJ5189JRTTzv9jG/U5Hlh/e3631GTL9TiRcon1m/UeLXWryXE5UQdMxCLWUC8OgIQOjpmoUmmijh0jlnokazQiJXq4CxxxEAwb4l65Bu7v5D7Cbcn5/8Lt/iF3OPQ/RPIPQ7d3yD3O25/QG15tZkhPRchT0MPakik36nFWkeHCG3YJcnBDatjabvilmW2lNsc0hG4MWZYp9SnY1E5hsc5sevKQcrqVtpcmSfyZ859DhvEeUY8xrVwuve2Zrado8wwiz78GjB31tNVTZXKKOqKu6m1QL0zxu02c+9bqod5J2PI99wn7no0+TZPxe0ziE72fxHBVM+qUfy/ITLsrhfmiujxsXn6SLvlnboeSKFpjglf4jPDKaPoQtXXOkht6WcrQMTMrk1t7ClnjhYiBqO1VhZBWkt7RlDiUvqTc6gi0jBhOguZa2vNSSEoBHLsTfDpCTTvBQIDHqSzR67Htr0Wh2GZ3+qJD+iNGlI+KL7FsChre+1SfWJhx7KsqfQ1a9ob0A7hbSvZ2WmWdIaqtxsQMnSbmDFmKjaOyll4OkaXmtCbLisQeXyb5+RhlUwkQKEw5XSLOsVr014EW8xSI7arDhOyqHiDM6uxGfiHPeJaBDOV2RqbxTNuSzHBvyaCv8Fgp/zsRh6lWLtCZKCNoQF2BArkeEbdCl+gazHczSzRYybzRy9pGdYPcnBg4rPzHKOS5pTEQzQInM0+gCDNRBklbwJk6TsyHQFoHtSmsbZZMljszZxDro2CN0hLB9Kxifs0jCRVx+6BICwch/iKZJFkDgGkDdoIY8U1IIxD0i5PCV2lbWubjB0ROSPNayCUq0qcxip2Yjy0AJAYc4yoth6jVpqCVgqSMUPEorF6X63Q7h0a0q2wCh3A2jhWqjzfyACjstLIlstcPcdl8HER8Bfo/WipsKP1rAvjoXY+NH/tgKEWS1IVNWSFiVLaOmtD21ISUSojWkEzc0ZPz0PjgRER6pHV07cfp+ip8eYeUVtn+stzkdMsfK584LUntvSN6nWZGYXU1kNaVzQQlIyY0p2NQ7U4Rc6OhQ4CHWyI3WWbp00n5ckSZyjleUOy9iAqpNvpLsBnn+C/0kM1ixPPW43eyTlOCYdkne69GnI3QWlXBLjXvdw10vjyH+orTZenEml4dJLLyAWL3VXwZdFc9RYHKg/tCNPJriJANqlXMJvstjy71urVZNDSZy1Xj4QO1O/WnOmqoGkY1kZF0sIiP1dogIJi5cfz9CjkXM43Pxo0Ero4e5BMtX06drWEw/i+anKhvbx4RYrQDbgMj1pJYQ5blL9wxcPlCsYigTH1eUoyIxtP2LFX1NWD4FHdXYuvRBKIiD3SOlggi71ZPdUWgC/N3eRQTFKBOWjRifNjy7o9e+5lDs8yCMCE0xZnkU3kGsUHjnYUhCDqqLMw3ChzedOwdef2If8bR6V5GWZrtms/c7XSROCqZw/VvU/3IA8qYfcImKsIYaXwkq+h+mkoX4mlDGL9uNVjT1M4Mh5FltDQNmiXAtLTCQpq7xFAhm5XMLyvpYDbrNTstYyCTx5T+CtycWsQ5QhuRvAJHKn2CFWO4jKwjMU5Kyyj/SBdws7Hqz+1a7OxFj8ZgjoY0cBzhCNGviBmUObWvgSw7bscdpndDilTZfICErFOdl3Qs6tSFPbuLv4EfgWjrdlGreuwYKADyyA1DC00DN2VdMJj0gEaEyMKIlw61j8JTadzE408e35KtL1jA3e342rhumLnp01P3RYzXY9AkE8GkgHfOvF8hGJE/KB4DjYjoWG7bTWOEQvrPrO/NUUKbRjmUB+oAx4/OxRIqtByVPzA0WiWqEJwZUke5zKFcBDORbvDnOGajfSg5dmWlYLWEeJtjyZeUT+m03iUd0FHmkhHCBrpIsUVHWeVc10lvpR3+KbTNfwuXVngSfAt4hMBQz+VygpmShjK7lPllSKQgNyN7DVrTVaiQaIEjTypedImBfFpPvI65qdIlemmBPQIo6jQcXw8yhHtdDGBpt79bM454nH2Zvf0hy7j9Zy+Y3shyRRhitC2vBn3At4hGYlldAu7ihPy3RmqwtSRBZJw8EM7pdGPUoCvg6Eu/HgXj566HDztOIGvyG0DR8kcugCGs9asHGmr9ed9xfPKYqauA1RFhWSzoifwX3CSXbQvAv3QvQ2NZ8O89ZnxlEWDj0UT1mCPha+Xo9tF0w49Am3sGr0X4ySdkRxDL40Il9dH2Iv4d1j5X0Tgr4rYwRJUAAABhGlDQ1BJQ0MgcHJvZmlsZQAAeJx9kT1Iw0AcxV9bRS0VBTuIOGSoTq2IijhqFYpQIdQKrTqYXPoFTRqSFBdHwbXg4Mdi1cHFWVcHV0EQ/ABxc3NSdJES/5cUWsR4cNyPd/ced+8Af73MVLNjHFA1y0gl4kImuyp0vSKIfvRgDFGJmfqcKCbhOb7u4ePrXYxneZ/7c/QqOZMBPoF4lumGRbxBPL1p6Zz3icOsKCnE58RRgy5I/Mh12eU3zgWH/TwzbKRT88RhYqHQxnIbs6KhEk8RRxRVo3x/xmWF8xZntVxlzXvyF4Zy2soy12kOI4FFLEGEABlVlFCGhRitGikmUrQf9/APOX6RXDK5SmDkWEAFKiTHD/4Hv7s185MTblIoDnS+2PbHCNC1CzRqtv19bNuNEyDwDFxpLX+lDsx8kl5raZEjoG8buLhuafIecLkDDD7pkiE5UoCmP58H3s/om7LAwC0QXHN7a+7j9AFIU1fJG+DgEBgtUPa6x7u723v790yzvx+k33K7aPHtcgAADRxpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+Cjx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IlhNUCBDb3JlIDQuNC4wLUV4aXYyIj4KIDxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+CiAgPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIKICAgIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIgogICAgeG1sbnM6c3RFdnQ9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZUV2ZW50IyIKICAgIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIKICAgIHhtbG5zOkdJTVA9Imh0dHA6Ly93d3cuZ2ltcC5vcmcveG1wLyIKICAgIHhtbG5zOnRpZmY9Imh0dHA6Ly9ucy5hZG9iZS5jb20vdGlmZi8xLjAvIgogICAgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIgogICB4bXBNTTpEb2N1bWVudElEPSJnaW1wOmRvY2lkOmdpbXA6ZWFhY2UzOGEtMDlkZS00YWZlLWFhY2MtMmY2NDRjZmY0NGU0IgogICB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOjc5MGZmOWEzLWIwN2QtNDA1NC04YWFmLWFkMDcwNTcwMTJkYiIKICAgeG1wTU06T3JpZ2luYWxEb2N1bWVudElEPSJ4bXAuZGlkOmFiMTAwMzY2LTJkNDktNDJjYS1hMWM0LTlkNTI5MDJhMWNiZCIKICAgZGM6Rm9ybWF0PSJpbWFnZS9wbmciCiAgIEdJTVA6QVBJPSIyLjAiCiAgIEdJTVA6UGxhdGZvcm09Ik1hYyBPUyIKICAgR0lNUDpUaW1lU3RhbXA9IjE2MzQzNzg0NzM0NTY5MzciCiAgIEdJTVA6VmVyc2lvbj0iMi4xMC4yNCIKICAgdGlmZjpPcmllbnRhdGlvbj0iMSIKICAgeG1wOkNyZWF0b3JUb29sPSJHSU1QIDIuMTAiPgogICA8eG1wTU06SGlzdG9yeT4KICAgIDxyZGY6U2VxPgogICAgIDxyZGY6bGkKICAgICAgc3RFdnQ6YWN0aW9uPSJzYXZlZCIKICAgICAgc3RFdnQ6Y2hhbmdlZD0iLyIKICAgICAgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDo4ODIzYWQzNy05NmE3LTQ5ZDUtOGU1ZC05NjE2ZGY5ZDJmZmIiCiAgICAgIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkdpbXAgMi4xMCAoTWFjIE9TKSIKICAgICAgc3RFdnQ6d2hlbj0iMjAyMS0xMC0xNlQxMjowMToxMyswMjowMCIvPgogICAgPC9yZGY6U2VxPgogICA8L3htcE1NOkhpc3Rvcnk+CiAgPC9yZGY6RGVzY3JpcHRpb24+CiA8L3JkZjpSREY+CjwveDp4bXBtZXRhPgogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgCjw/eHBhY2tldCBlbmQ9InciPz7i/7/LAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH5QoQCgEN+smnhQAAIABJREFUeNrtXVlX21jW3fIgy5I8gkMIJEDm6qrqp37p///Q/dara8hX6RAICTN4tmXJsqzvIb1PXzkGbGPLkEJrsSpJAb66w77n7LPPOVoYhiEenofn4Zn7w6M1esQ0TRv754cxPzyLfFKj/zAcDuXPiURiqZtO3XCapt24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"/></a>
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

    {utxos_table}

    {transactions_table}

    {comparisons_table}

    {diff_table}
    </ul>

  </body>

</html>
`;
