import { createGlobalStyle } from 'styled-components'

export default createGlobalStyle`
  ${'' /* put your global css here */}
body {
  color: ${({ theme }) => theme.colors.fontColor}
}
@media print {
  div {
    position: relative
  }
  h1 {
    margin-bottom: 0rem;
  }
  ul.max-height-overflow {
    max-height: 100% !important;
    overflow: unset !important;
  }
  div.timeline__card {
    border: 0px;
    float: none;
    transform: translate(0);
  }
  div.timeline__item {
    width: 100%;
  }
  .pageBreakAfter {
    page-break-after: always;
  }
  .noPrint, timeline__date {
    display: none !important;
  }
  .sc-AxirZ, sc-AxiKw, sc-AxjAm {
    box-sizing: border-box;
    display: block;
    -webkit-flex: none;
    -ms-flex: none;
    flex: none;
    -webkit-flex-wrap: nowrap;
    -ms-flex-wrap: nowrap;
    flex-wrap: nowrap;
    max-width: 100%;
  }
  .inner {
    max-width: 100%;
    width: 100%;
    color: #FFF;
    background-color: #636363;
  }
  .timeline__card-title:after {
    content: none !important;
  }
  .timeline:before {
    content: none !important;
    display: none;
  }
}
`
