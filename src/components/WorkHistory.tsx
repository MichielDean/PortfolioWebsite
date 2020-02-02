import React from 'react';
import { IEmploymentData } from '../data/employmentData/employmentData';
import styled from 'styled-components';
import { BulletedListData } from './BulletListDetails';

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
  public render() {
    return (
      <div>
        <Employer>{this.props.employmentData.employer}</Employer>
        <p>
          {this.props.employmentData.employmentStart} - {this.props.employmentData.employmentEnd} ({this.props.employmentData.location})
        </p>
        <BulletedListData bulletedListData={this.props.employmentData} />
      </div>
    );
  }
}
