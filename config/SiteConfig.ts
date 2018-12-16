export default {
  pathPrefix: '/', // Prefix for all links. If you deploy your site to example.com/portfolio your pathPrefix should be "portfolio"

  siteTitle: 'Michiel Bugher Portfolio', // Navigation and Site Title
  siteTitleAlt: 'MB', // Alternative Site title for SEO
  siteUrl: 'https://MichielBugher.com', // Domain of your site. No trailing slash!
  siteLanguage: 'en', // Language Tag on <html> element
  siteBanner: '/assets/banner.jpg', // Your image for og:image tag. You can find it in the /static folder
  defaultBg: '/assets/bg.png', // default post background header
  favicon: 'src/favicon.png', // Your image for favicons. You can find it in the /src folder
  siteDescription: 'Portfolio Website For Michiel Bugher', // Your site description
  author: 'Michiel Bugher', // Author for schemaORGJSONLD
  siteLogo: '/assets/logo.png', // Image for schemaORGJSONLD
  linkedInLogo: '/assets/linkedInLogo.png',
  gitHubLogo: '/assets/githubLogo.png',
  emailLogo: '/assets/emailLogo.png',
  cvLogo: '/assets/cv.png',
  resumePdf: '/assets/MichielBugherResume.pdf',

  // Manifest and Progress color
  // See: https://developers.google.com/web/fundamentals/web-app-manifest/
  themeColor: '#3498DB',
  backgroundColor: '#2b2e3c',

  // Settings for typography.ts
  headerFontFamily: 'Bitter',
  bodyFontFamily: 'Open Sans',
  baseFontSize: '18px',

  // Social media
  siteFBAppID: '',

  //
  Google_Tag_Manager_ID: 'GTM-MVP42QK',
  POST_PER_PAGE: 4,
};
