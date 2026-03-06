# /setup-auth -- Set Up Authentication Flow

You are setting up the authentication flow for a Lumina client application (React or React Native).

## Step 1: Determine Platform

Ask the user:
1. **Platform:** React (web) or React Native?
2. **Router:** React Router, Next.js, Expo Router, React Navigation, or other?
3. **API URL:** What is the backend API URL? (e.g., `http://localhost:8000/api` for dev)

## Step 2: Generate Files

### 1. API Configuration (entry point)

**React (Vite):**
```tsx
// src/main.tsx or src/index.tsx
import { configureApi } from '@startsoft/lumina';

// Configure API before rendering
configureApi({
  baseURL: import.meta.env.VITE_API_URL,
});
```

**React Native:**
```tsx
// App.tsx or src/config/api.ts
import { configureApi } from '@startsoft/lumina';
import { createNativeStorage } from '@startsoft/lumina';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure storage for React Native
// (Web uses localStorage by default)
configureApi({
  baseURL: 'https://api.example.com/api',
  onUnauthorized: () => {
    // Navigate to login screen
    // e.g., navigation.navigate('Login');
  },
});
```

### 2. AuthProvider Wrapping

```tsx
// src/App.tsx
import { AuthProvider } from '@startsoft/lumina';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {/* Router / Navigation goes here */}
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
```

### 3. Login Page/Screen

**React (web):**
```tsx
// src/pages/LoginPage.tsx
import { useState } from 'react';
import { useAuth } from '@startsoft/lumina';
import { useNavigate } from 'react-router-dom';

export function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already authenticated
  if (isAuthenticated) {
    navigate('/dashboard');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await login(email, password);

    if (result.success) {
      // Navigate to organization dashboard
      const orgSlug = result.organization_slug;
      if (orgSlug) {
        navigate(`/orgs/${orgSlug}/dashboard`);
      } else {
        navigate('/select-organization');
      }
    } else {
      setError(result.error || 'Login failed');
    }

    setIsLoading(false);
  };

  return (
    <div>
      <h1>Login</h1>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}
```

**React Native:**
```tsx
// src/screens/LoginScreen.tsx
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '@startsoft/lumina';

export function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    const result = await login(email, password);

    if (result.success) {
      const orgSlug = result.organization_slug;
      navigation.replace('Dashboard', { organization: orgSlug });
    } else {
      Alert.alert('Error', result.error || 'Login failed');
    }
    setIsLoading(false);
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>Login</Text>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        style={{ borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 10, borderRadius: 5 }}
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{ borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 20, borderRadius: 5 }}
      />
      <TouchableOpacity
        onPress={handleLogin}
        disabled={isLoading}
        style={{ backgroundColor: '#007AFF', padding: 15, borderRadius: 5, alignItems: 'center' }}
      >
        <Text style={{ color: 'white', fontWeight: 'bold' }}>
          {isLoading ? 'Logging in...' : 'Login'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
```

### 4. Logout Handler

```tsx
// Can be a button in a header/sidebar component
import { useAuth } from '@startsoft/lumina';
import { useNavigate } from 'react-router-dom';

export function LogoutButton() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return <button onClick={handleLogout}>Logout</button>;
}
```

### 5. Protected Route Pattern

**React Router:**
```tsx
// src/components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '@startsoft/lumina';

interface Props {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: Props) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Usage in router:
// <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
```

**React Native (React Navigation):**
```tsx
// src/navigation/AppNavigator.tsx
import { useAuth } from '@startsoft/lumina';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();

export function AppNavigator() {
  const { isAuthenticated } = useAuth();

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {isAuthenticated ? (
          <>
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            {/* Protected screens */}
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            {/* Auth screens */}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

## Step 3: Environment Variables

Remind the user to set up their environment:

**Vite (.env):**
```
VITE_API_URL=http://localhost:8000/api
```

**React Native:**
Set the `baseURL` directly in `configureApi()` or use a config file.

## Summary Checklist

- [ ] `configureApi()` called before app renders
- [ ] `AuthProvider` wraps the entire app (inside `QueryClientProvider`)
- [ ] Login page uses `useAuth().login()`
- [ ] Logout handler uses `useAuth().logout()`
- [ ] Protected routes check `useAuth().isAuthenticated`
- [ ] Environment variable set for API URL
