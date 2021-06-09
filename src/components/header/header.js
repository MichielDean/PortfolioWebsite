import React from 'react'
import styled from 'styled-components'
import { FiSun, FiMoon } from "react-icons/fi"
import Switch from 'react-switch'
import siteConfig from '../../../data/siteConfig'

const HeaderWrapper = styled.header`
  position: fixed;
  top: 0;
  right: 0;
  padding-left: 1rem;
  border-radius: 1rem;
  margin: 0 auto;
  display: block;
  z-index: 1000;
  background-color: ${({ theme }) => theme.colors.primary};
`

const HeaderNav = styled.nav`
  margin-left: auto;
  margin-right: auto;
  height: 60px;
  display: flex;
  flex-direction: row;
  max-width: 960px;
  z-index: 1000;
  justify-content: space-between;
  overflow-x: auto;
  overflow-y: hidden;
  background-color: ${({ theme }) => theme.colors.primary};
  a:hover {
    filter: brightness(0.6);
  }
`

const StyledSwitch = styled(Switch).attrs(props => ({
  onHandleColor: props.theme.colors.primary,
  offHandleColor: props.theme.colors.primary,
}))`

`

const SwitchWrapper = styled.div`
  display: flex;
  align-items: center;
  padding-right: 20px;
`

const IconWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
`

const Header = ({ onChangeTheme, theme }) => {
  return (
    <HeaderWrapper className="noPrint">
      <HeaderNav>
        {siteConfig.enableDarkmode && <SwitchWrapper >
          <StyledSwitch 
            onChange={onChangeTheme} 
            checked={theme === 'light'}
            onColor="#626262"
            offColor="#212121"
            checkedIcon={<IconWrapper><FiSun color="yellow" /></IconWrapper>}
            uncheckedIcon={<IconWrapper><FiMoon color="white" /></IconWrapper>}
          />
        </SwitchWrapper>}
      </HeaderNav>
    </HeaderWrapper>
  )
}

export default Header