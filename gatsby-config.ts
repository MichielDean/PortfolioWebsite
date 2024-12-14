import type { GatsbyConfig } from "gatsby"

const config: GatsbyConfig = {
  siteMetadata: {
    siteUrl: `https://www.michielbugher.com`,
  },
  graphqlTypegen: true,
  plugins: [
    'gatsby-plugin-image',
    'gatsby-plugin-sharp',
    'gatsby-transformer-sharp',
    {
      resolve: 'gatsby-source-filesystem',
      options: {
        name: 'images',
        path: `${__dirname}/src/images`,
      },
    },
    {
      resolve: `gatsby-plugin-netlify`,
      options: {
        headers: {},
        allPageHeaders: [],
        mergeSecurityHeaders: true,
        mergeCachingHeaders: true,
        transformHeaders: (headers: any, path: any) => headers,
        generateMatchPathRewrites: true,
        excludeDatastoreFromEngineFunction: false,
        imageCDN: false
      },
    },
    {
      resolve: `gatsby-plugin-manifest`,
      options: {
        name: `Michiel Bugher Portfolio`,
        short_name: `MB Portfolio`,
        start_url: `/`,
        background_color: `#ffffff`,
        theme_color: `#663399`,
        display: `minimal-ui`,
        icon: `src/images/favicon.png`, // Must be square, min 512x512px
        icons: [
          {
            src: `src/images/favicon.png`,
            sizes: `192x192`,
            type: `image/png`,
          },
          {
            src: `src/images/favicon.png`,
            sizes: `512x512`,
            type: `image/png`,
          },
        ],
      },
    }
  ]
}

export default config
