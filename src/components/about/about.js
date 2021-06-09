import React from 'react'

export default ({ className = '',  title = 'about', text = '' }) => {
  return (
    <div className={className}>
      <h1>{title}</h1>
      <p dangerouslySetInnerHTML={{ __html: text }}></p>
    </div>
  )
}
