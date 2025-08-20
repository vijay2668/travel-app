import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import React, { useCallback, useEffect, useState } from "react";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { useOAuth } from "@clerk/clerk-expo";

const useWarmUpBrowser = () => {
  useEffect(() => {
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
};

const GoogleSignIn = () => {
  const [loading, setLoading] = useState(false);
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" });
  const [error, setError] = useState("");

  useWarmUpBrowser();

  const onGoogleSignInPress = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { createdSessionId, setActive } = await startOAuthFlow({
        redirectUrl: Linking.createURL("")
      });
      if (createdSessionId) {
        await setActive!({ session: createdSessionId });
      } else {
        setError("Google Sign-in Incomplete. Please try again");
      }
    } catch (err: any) {
      console.log("Error", err);
      setError(err.errors[0]?.message || "Google SignIn Failed");
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <View className="w-full">
      {error ? (
        <Text className="text-red-500 text-sm text-center mb-3">{error}</Text>
      ) : null}
      <TouchableOpacity
        onPress={onGoogleSignInPress}
        className="w-full border border-gray-300 py-3 mt-3 rounded-lg flex-row justify-center items-center"
      >
        {loading ? (
          <ActivityIndicator color="#FF5722" />
        ) : (
          <>
            <Image
              source={{ uri: "https://www.google.com/favicon.ico" }}
              className="w-5 h-5 mr-2"
            />
            <Text className="text-gray-900 text-base font-semibold">
              Sign In with Google
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

export default GoogleSignIn;

const styles = StyleSheet.create({});
