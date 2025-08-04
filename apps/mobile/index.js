import {AppRegistry, LogBox} from 'react-native';
import App from './App';
import {name as appName} from './package.json';

// Suppress warnings that can interfere with testing
LogBox.ignoreLogs([
  'Each child in a list should have a unique "key" prop',
  'Warning: Each child in a list should have a unique "key" prop',
]);

AppRegistry.registerComponent('ExpenseTracker', () => App);