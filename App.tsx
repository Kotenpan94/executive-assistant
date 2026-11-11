import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Navigation from './src/navigation';
import { WeekProvider } from './src/state/WeekContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <WeekProvider>
        <StatusBar style="auto" />
        <Navigation />
      </WeekProvider>
    </SafeAreaProvider>
  );
}
