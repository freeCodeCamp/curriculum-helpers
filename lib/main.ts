import * as helper from './index';
import cssFixtures  from '../lib/__fixtures__/curriculum-helper-css'

const { cssFullExample } = cssFixtures;

console.log(helper.removeCssComments(cssFullExample))
