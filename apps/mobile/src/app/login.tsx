import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

const redirectTo = AuthSession.makeRedirectUri({
  scheme: 'raah',
  path: 'auth/callback',
});

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);

  async function signInWithGoogle() {
    try {
      setLoading(true);

      console.log('REDIRECT TO SUPABASE:', redirectTo);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        throw error;
      }

      if (!data.url) {
        throw new Error('Could not start Google authentication');
      }

      console.log('Opening OAuth URL:', data.url);

      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectTo
      );

      console.log('AUTH RESULT:', result);

      if (result.type !== 'success') {
        return;
      }

      const callbackUrl = result.url;

      console.log('OAuth callback received');

      // First try PKCE code flow
      const parsedUrl = Linking.parse(callbackUrl);
      const code = parsedUrl.queryParams?.code;

      if (typeof code === 'string' && code.length > 0) {
        console.log('Exchanging code for session');

        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          throw exchangeError;
        }

        router.replace('/');
        return;
      }

      // Fallback for implicit/token flow
      const hashIndex = callbackUrl.indexOf('#');

      if (hashIndex !== -1) {
        const hash = callbackUrl.substring(hashIndex + 1);
        const params = new URLSearchParams(hash);

        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
          const { error: sessionError } =
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

          if (sessionError) {
            throw sessionError;
          }

          router.replace('/');
          return;
        }
      }

      throw new Error(
        'Authentication completed, but no session was found.'
      );
    } catch (error) {
      console.error('GOOGLE LOGIN ERROR:', error);

      Alert.alert(
        'Login failed',
        error instanceof Error
          ? error.message
          : 'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>राह</Text>
        </View>

        <Text style={styles.appName}>Raah</Text>

        <Text style={styles.title}>
          Your voice.{'\n'}
          Your community.
        </Text>

        <Text style={styles.subtitle}>
          Report local issues, support problems that matter to you,
          and track the progress towards solving them.
        </Text>

        <Pressable
          style={({ pressed }) => [
            styles.googleButton,
            pressed && styles.googleButtonPressed,
            loading && styles.disabledButton,
          ]}
          onPress={signInWithGoogle}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#111827" />
          ) : (
            <>
              <View style={styles.googleIcon}>
                <Text style={styles.googleLetter}>G</Text>
              </View>

              <Text style={styles.googleText}>
                Continue with Google
              </Text>
            </>
          )}
        </Pressable>

        <Text style={styles.terms}>
          By continuing, you agree to use Raah responsibly and help
          make your community better.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },

  content: {
    width: '100%',
  },

  logoContainer: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  logo: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '800',
  },

  appName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2563EB',
    marginBottom: 16,
  },

  title: {
    fontSize: 38,
    fontWeight: '800',
    color: '#111827',
    lineHeight: 46,
    letterSpacing: -0.8,
  },

  subtitle: {
    fontSize: 16,
    lineHeight: 25,
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 40,
  },

  googleButton: {
    height: 58,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },

  googleButtonPressed: {
    opacity: 0.8,
  },

  disabledButton: {
    opacity: 0.6,
  },

  googleIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  googleLetter: {
    fontSize: 17,
    fontWeight: '800',
    color: '#4285F4',
  },

  googleText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },

  terms: {
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
    color: '#9CA3AF',
    marginTop: 24,
    paddingHorizontal: 16,
  },
});