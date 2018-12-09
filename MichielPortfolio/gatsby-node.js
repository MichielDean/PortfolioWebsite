const path = require('path');
const _ = require('lodash');

exports.onCreateNode = ({ node, actions }) => {
  const { createNodeField } = actions;
  if (node.internal.type === 'MarkdownRemark' && _.has(node, 'frontmatter') && _.has(node.frontmatter, 'title')) {
    const slug = `${_.kebabCase(node.frontmatter.title)}`;
    createNodeField({ node, name: 'slug', value: slug });
  }
};

exports.onCreateWebpackConfig = ({ stage, actions }) => {
  actions.setWebpackConfig({
                             resolve: {
                               modules: [path.resolve(__dirname, 'src'), 'node_modules'],
                             },
                           });
};
