import { Stack } from 'expo-router';

export default function ProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#0A0A0A' },
        headerTintColor: '#FFFFFF',
      }}
    >
      <Stack.Screen 
        name="edit" 
        options={{ 
          headerShown: true,
          presentation: 'card',
        }} 
      />
      <Stack.Screen 
        name="edit-username" 
        options={{ 
          headerShown: true,
          presentation: 'card',
        }} 
      />
    </Stack>
  );
}
