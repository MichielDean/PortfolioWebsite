import React from 'react';
import config from '../../config/SiteConfig';

export class EmailLink extends React.Component {
  handleClick = () => {
    window.location.href = 'mailto:miyike@gmail.com';
  };

  render() {
    return (
      <a href="#" onClick={this.handleClick}>
        <img className="contact-logo round-image-edges" src={config.emailLogo} alt="Github" />
      </a>
    );
  }
}
