import React from 'react';
import styled from 'styled-components';
import { IBulletedListData } from '../data/bulletedListData';

interface Props {
  bulletedListData: IBulletedListData;
}

export const BulletedList: any = styled.ul`
  font-family: 'Open Sans', sans-serif;
  font-size: 15px;
`;

export class BulletedListData extends React.PureComponent<Props> {
  bulletedListDetails = this.props.bulletedListData.details.map((detail, index) => (
    <li key={index}>
      <p>{detail}</p>
    </li>
  ));

  public render() {
    return (
      <div>
        <BulletedList>{this.bulletedListDetails}</BulletedList>
      </div>
    );
  }
}
