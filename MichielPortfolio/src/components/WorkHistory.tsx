import React from 'react';
import { IEmploymentData } from '../data/employmentData/emplyomentData';
import styled from 'styled-components';

interface Props {
  employmentData: IEmploymentData;
}

export const Employer: any = styled.p`
  font-weight: bold;
  text-decoration: underline;
  font-family: 'Open Sans', sans-serif;
  font-size: 20px;
`;

export const EmploymentDetails: any = styled.ul`
  font-family: 'Open Sans', sans-serif;
  font-size: 15px;
`;

export class WorkHistory extends React.PureComponent<Props> {
  employmentDetails = this.props.employmentData.details.map((detail, index) => (
    <li key={index}>
      <p>{detail}</p>
    </li>
  ));

  public render() {
    return (
      <div>
        <Employer>{this.props.employmentData.employer}</Employer>
        <p>
          {this.props.employmentData.employmentStart} - {this.props.employmentData.employmentEnd}
        </p>
        <EmploymentDetails>{this.employmentDetails}</EmploymentDetails>
      </div>
    );
  }
}
