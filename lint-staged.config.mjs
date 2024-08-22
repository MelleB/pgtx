export default {
  '*.ts': ['eslint --fix', 'prettier --write'],
  '(*.json|*.mjs,*.md)': 'prettier --write',
};
