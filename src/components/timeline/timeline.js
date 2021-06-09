import React from 'react'
import styled from 'styled-components'
import { config } from 'react-awesome-styled-grid'
import siteConfig from '../../../data/siteConfig'

function monthDiff(d1, d2) {
	var months = (d2.getFullYear() - d1.getFullYear()) * 12;
  months -= d1.getMonth();
  months += d2.getMonth();
  months += 1; //January = 1 instead of 0

  return months <= 0 ? 0 : months;
}

function durationDiffAsString(d1, d2) {
  if(!d2) {
    d2 = new Date();
  }

  var months = monthDiff(d1, d2);
  var monthPlural;

  if(months === 12) {
    return "1 year";
  }

  if(months > 12) {
    var years =  Math.floor(months/12);
    months = months - years * 12;

    var yearPlural = years > 1 ? 'years' : 'year';
    monthPlural = months > 1 ? 'months' : 'month';

    if(months > 0) {
      return `${years} ${yearPlural} ${months} ${monthPlural}`
    }

    return `${years} ${yearPlural}`
  }

  monthPlural = months > 1 ? 'months' : 'month';
  
  return `${months} ${monthPlural}`
}

const Timeline = ({ className }) => (
  <div className={className}>
    <h1>Experience</h1>
    {siteConfig.jobs && siteConfig.jobs.map((job, jobIndex) => (
      <article 
        key={siteConfig.monthNames[job.startDate.getMonth()] + job.startDate.getFullYear()} 
        className='timeline__item animate-on-scroll'
      >
        <div className='inner'>
          <span className="timeline__date noPrint">
            <span className="timeline__month">{siteConfig.monthNames[job.startDate.getMonth()]}</span>
            <span className="timeline__year">{job.startDate.getFullYear()}</span>
          </span>
          <div className="timeline__card">
            <h2 className='timeline__card-title'>
              {job.company
                ? `${job.occupation} at ${job.company}`
                : `${job.occupation}`} 
              <br />
              <small className='timeline__card-title--small'>
                ({job.endDate ? durationDiffAsString(job.startDate, job.endDate) : durationDiffAsString(job.startDate, job.endDate) + ' - Present'})
              </small>
            </h2>
            <ul className="max-height-overflow">
            {
              job.description.map((detail, index) => (
                <li key={index} >
                  <div>{detail}</div>
                </li>
              ))
            }
            </ul>
          </div>
        </div>
      </article>
    ))}
  </div>
)

export default styled(Timeline)`
  position: relative;
  :before {
    content: '';
    display: block;
    position: absolute;
    left: 50%;
    top: 0;
    margin: 70px 0 0 -1px;
    width: 1px;
    height: calc(100% - 70px);
    background: ${({ theme }) => theme.colors.primary};
  }
  .timeline__item {
    width: 100%;
    margin: 0 0 20px 0;
    position: relative;
  }
  .timeline__item:after {
    content: '';
    display: block;
    clear: both;
  }
  .timeline__item div.inner {
    width: 100%;
    float: left;
    margin: 85px 0 0 0;
  }
  .timeline__date {
    display: block;
    width: 5rem;
    height: 5rem;
    padding: 1rem .5rem;
    position: absolute;
    top: 0;
    left: 50%;
    margin: 0 0 0 -2.5rem;
    border-radius: 100%;
    font-size: 12px;
    font-weight: 900;
    text-transform: uppercase;
    background: ${({ theme }) => theme.colors.primary};
    color: #fff;
    box-shadow: 0 0 0 7px ${({ theme }) => theme.colors.background};
  }
  .timeline__date span {
    display: block;
    text-align: center;
  }
  .timeline__month {
    font-size: 18px;
    padding-top: 4px;
  }
  .timeline__year {
    font-size: 10px;
  }
  .timeline__card {
    border-radius: 6px;
    border: 1px solid ${({ theme }) => theme.colors.primary};
    transform: translate(-50%);
  }
  .timeline__card-title {
    padding: 15px;
    margin: 0;
    color: #fff;
    font-size: 20px;
    text-transform: uppercase;
    border-radius: 3px 3px 0 0;
    position: relative;
  }
  .timeline__card-title:after {
    content: '';
    position: absolute;
    top: -5px;
    left: 30%;
    width: 10px; 
    height: 10px;
    transform: rotate(-45deg);
  }
  .timeline__item div.inner p {
    padding: 15px;
    margin: 0;
    font-size: 14px;
    background: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.fontColor};
    border-radius: 0 0 6px 6px;
  }
  .timeline__item:nth-child(2n+2) div.inner {
    float: right;
    .timeline__card {
      transform: translate(50%);
    }
  }
  .timeline__card-title {
    background: ${({ theme }) => theme.colors.primary};
  }
  .timeline__card-title:after {
    background: ${({ theme }) => theme.colors.primary};
  }

  .timeline__card-title--small {
    font-size: 10px;
  }

  .timeline__item.is-visible div.inner {
    .timeline__card {
      transition: transform 1s ease-in;
      transform: translate(0);
    }
  }
  .max-height-overflow {
    max-height: 40rem;
    margin-left: 0;
    padding-left: 1.45rem;
    padding-right: 1rem;
    margin-bottom: 0px;
    overflow: auto;
  }

  @media only screen and (max-width: 767px) {
    :before {
      content: none;
    }
  }

  ${p => config(p).media['sm']`
  .timeline__item div.inner {
    width: 40%;
    margin: 5px 0 0 0;
  }

  .timeline__item div.inner h2:after {
    top: 20px;
    left: unset;
    right: -5px;
  }
  .timeline__item:nth-child(2n+2) div.inner h2:after {
    left: -5px;
  }
  `}
`
