import styled from 'styled-components'
import { config } from 'react-awesome-styled-grid'

const Wrapper = styled.main.attrs({
  role: 'main',
})`
  position: relative;
  width: 100%;
  padding: 5rem;
  word-wrap: break-word;
  background-color: ${({ theme }) => theme.colors.background};
  margin: 0px auto 30px auto;
  box-shadow: 0 0 0 0, 0 6px 12px rgba(0, 0, 0, 0.1);
  min-height: 150px;
  
  ${(props) => config(props).media.sm`
    width: 100%;
    padding: 5rem;
  `}
`

export default Wrapper
