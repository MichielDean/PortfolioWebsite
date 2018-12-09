/* eslint-disable react/require-default-props */
import React from 'react';
import Helmet from 'react-helmet';
import config from '../../config/SiteConfig';

interface SEO {
  postPath: string;
}

export const SEO = () => {
  let title;
  let description;
  let image;
  const realPrefix = config.pathPrefix === '/' ? '' : config.pathPrefix;
  title = config.siteTitle;
  description = config.siteDescription;
  image = config.siteBanner;
  image = config.siteUrl + realPrefix + image;
  return (
    <Helmet>
      <html lang={config.siteLanguage} />
      <title>{config.siteTitle}</title>
      <meta name="description" content={description} />
      <meta name="image" content={image} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
    </Helmet>
  );
};
